import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { formatOrderId } from "@/lib/utils";
import { notifyAdminPurchaseOrder } from "@/lib/email";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function getSupabaseForWebhook() {
  if (isServiceRoleConfigured()) {
    return createServiceRoleClient();
  }
  return createServerClient();
}

function centsToUsd(amount: number | null | undefined): number {
  return Number(((amount || 0) / 100).toFixed(2));
}

function summarizeLineItems(
  items: Array<{ quantity?: number | null; description?: string | null }>
): { itemCount: number; itemsSummary: string } {
  const lines = items
    .map((item) => {
      const qty = Number(item.quantity || 1);
      const name = String(item.description || "Plastipac Product").trim();
      return `${qty}× ${name}`;
    })
    .filter(Boolean);

  return {
    itemCount: items.length,
    itemsSummary: lines.join("; ") || "See Stripe Dashboard",
  };
}

/**
 * Mark a matching order as paid when we can correlate a Stripe id.
 * Failures are logged and never thrown — email / webhook ACK must not be blocked.
 */
async function markOrderPaidByPaymentIntent(
  paymentIntentId: string | null | undefined
): Promise<{ orderId?: string; shipping?: Record<string, unknown> } | null> {
  if (!paymentIntentId) return null;

  try {
    const supabase = await getSupabaseForWebhook();
    const { data: matchingOrders, error } = await supabase
      .from("orders")
      .select("id, shipping_address, total, items, created_at");

    if (error) {
      console.error(
        "[stripe webhook] order lookup failed:",
        error.message || error
      );
      return null;
    }

    const orderToUpdate = matchingOrders?.find(
      (order: { shipping_address?: { stripe_payment_intent_id?: string } }) =>
        order.shipping_address?.stripe_payment_intent_id === paymentIntentId
    );

    if (!orderToUpdate) {
      console.log(
        "[stripe webhook] no local order matched payment intent:",
        paymentIntentId
      );
      return null;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderToUpdate.id);

    if (updateError) {
      console.error(
        "[stripe webhook] order status update failed:",
        updateError.message || updateError
      );
      // Still return the record so email can use existing details.
    }

    return {
      orderId: String(orderToUpdate.id),
      shipping: (orderToUpdate.shipping_address || {}) as Record<
        string,
        unknown
      >,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe webhook] markOrderPaid exception:", message);
    return null;
  }
}

async function dispatchAdminPoEmail(payload: {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  totalAmount: number;
  shippingState?: string;
  shippingCity?: string;
  shippingAddressSummary?: string;
  itemCount?: number;
  itemsSummary?: string;
  orderDate?: string;
}) {
  try {
    const result = await notifyAdminPurchaseOrder(payload);
    if (!result.success) {
      console.error(
        "[stripe webhook] admin PO email not sent:",
        result.error || (result.skipped ? "skipped (missing config)" : "unknown")
      );
      return;
    }
    console.log(
      "[stripe webhook] admin PO email sent to ADMIN_NOTIFICATION_EMAIL for",
      payload.orderId
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe webhook] admin PO email dispatch failed:", message);
  }
}

async function handleCheckoutSessionCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || null;

  // Persist / update DB first when possible (email must not roll this back).
  const matched = await markOrderPaidByPaymentIntent(paymentIntentId);

  let lineItems: Array<{
    quantity?: number | null;
    description?: string | null;
  }> = [];

  try {
    const listed = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 100,
    });
    lineItems = listed.data.map((item) => ({
      quantity: item.quantity,
      description: item.description,
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[stripe webhook] unable to load Checkout Session line items:",
      message
    );
  }

  const { itemCount, itemsSummary } = summarizeLineItems(lineItems);

  const customerEmail =
    session.customer_details?.email ||
    session.customer_email ||
    String(session.metadata?.customer_email || "") ||
    "customer@plastipacusa.com";

  const customerName =
    session.customer_details?.name ||
    String(session.metadata?.customer_name || "") ||
    "Customer";

  const customerCompany =
    String(session.metadata?.company_name || session.metadata?.company || "") ||
    "Plastipac USA Customer";

  const shippingDetails = session.shipping_details?.address;
  const shippingState =
    shippingDetails?.state ||
    String(session.metadata?.shipping_state || "") ||
    undefined;
  const shippingCity =
    shippingDetails?.city ||
    String(session.metadata?.shipping_city || "") ||
    undefined;
  const shippingAddressSummary = [
    shippingDetails?.line1,
    shippingDetails?.line2,
    [shippingCity, shippingState, shippingDetails?.postal_code]
      .filter(Boolean)
      .join(", "),
    shippingDetails?.country,
  ]
    .filter(Boolean)
    .join(" · ");

  const poReference =
    String(session.metadata?.po_reference || session.metadata?.order_id || "") ||
    (matched?.orderId
      ? formatOrderId({ id: matched.orderId, createdAt: new Date().toISOString() })
      : null) ||
    session.client_reference_id ||
    session.id;

  const totalAmount = centsToUsd(session.amount_total);

  await dispatchAdminPoEmail({
    orderId: poReference,
    customerName,
    customerEmail,
    customerCompany,
    totalAmount,
    shippingState,
    shippingCity,
    shippingAddressSummary: shippingAddressSummary || undefined,
    itemCount,
    itemsSummary,
    orderDate: new Date((session.created || Date.now() / 1000) * 1000).toISOString(),
  });
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  // Persist paid status only — admin email is dispatched from
  // checkout.session.completed (and from createOrderFromCheckout) to avoid duplicates.
  await markOrderPaidByPaymentIntent(paymentIntent.id);
}

export async function POST(request: NextRequest) {
  if (!stripeSecretKey || !webhookSecret) {
    console.error(
      "[stripe webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET."
    );
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 400 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-08-26.dahlia" as any,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(stripe, session);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      default:
        console.log("[stripe webhook] Ignored event type:", event.type);
    }
  } catch (error: unknown) {
    // Log but still ACK — Stripe retries should not loop on transient handler bugs
    // after signature verification already succeeded.
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe webhook] Handler error (ACK still 200):", message);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
