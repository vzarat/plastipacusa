import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { formatOrderId } from "@/lib/utils";
import { notifyAdminPurchaseOrder } from "@/lib/email";
import {
  fetchPlastipacLogoForPdf,
  generateInvoicePdf,
  type InvoicePdfItem,
} from "@/lib/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Display + audit label required for cleared Stripe checkouts */
const PAID_CLEARED_LABEL = "Paid & Cleared";
/** Canonical DB status used by dashboard filters */
const PAID_STATUS = "paid";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function getStripe() {
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(stripeSecretKey, {
    apiVersion: "2026-08-26.dahlia" as any,
  });
}

function getAdminSupabase() {
  if (!isServiceRoleConfigured()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for Stripe webhook order updates."
    );
  }
  return createServiceRoleClient();
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

function mapOrderItems(rawItems: unknown, fallbackTotal: number): InvoicePdfItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return [
      {
        description: "Industrial Stretch Packaging Order",
        quantity: 1,
        unitPrice: fallbackTotal,
        total: fallbackTotal,
      },
    ];
  }

  return rawItems.map((item: any) => {
    const quantity = Number(item?.quantity ?? 1) || 1;
    const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? 0) || 0;
    const total =
      Number(item?.totalPrice ?? item?.total_price ?? unitPrice * quantity) ||
      unitPrice * quantity;
    const name =
      item?.productName ||
      item?.product_name ||
      item?.name ||
      "Stretch Film";
    return {
      description: String(name),
      quantity,
      unitPrice,
      total,
    };
  });
}

function resolveSessionUserId(session: Stripe.Checkout.Session): string | null {
  const fromMeta =
    session.metadata?.userId ||
    session.metadata?.user_id ||
    session.client_reference_id ||
    null;
  const id = String(fromMeta || "").trim();
  return id || null;
}

function resolveOrderIdFromSession(
  session: Stripe.Checkout.Session
): string | null {
  const raw =
    session.metadata?.order_id ||
    session.metadata?.orderId ||
    session.metadata?.po_reference ||
    null;
  const id = String(raw || "").trim();
  return id || null;
}

type OrderRow = {
  id: string;
  shipping_address?: Record<string, unknown> | null;
  total?: number | null;
  total_usd?: number | null;
  total_amount?: number | null;
  items?: Array<{
    gauge?: string | number | null;
    quantity?: number;
    productName?: string;
    product_name?: string;
    name?: string;
    unitPrice?: number;
    unit_price?: number;
    totalPrice?: number;
    total_price?: number;
  }> | null;
  created_at?: string | null;
  user_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  company_name?: string | null;
  status?: string | null;
};

async function findOrderForSession(input: {
  orderIdHint: string | null;
  paymentIntentId: string | null;
  checkoutSessionId: string;
  userId: string | null;
}): Promise<OrderRow | null> {
  const supabase = getAdminSupabase();

  if (input.orderIdHint) {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", input.orderIdHint)
      .maybeSingle();

    if (!error && data) return data as OrderRow;
  }

  const { data: rows, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Order lookup failed: ${error.message}`);
  }

  const list = (rows || []) as OrderRow[];

  const byPaymentIntent = input.paymentIntentId
    ? list.find(
        (order) =>
          order.shipping_address?.stripe_payment_intent_id ===
          input.paymentIntentId
      )
    : null;
  if (byPaymentIntent) return byPaymentIntent;

  const bySession = list.find(
    (order) =>
      order.shipping_address?.stripe_checkout_session_id ===
      input.checkoutSessionId
  );
  if (bySession) return bySession;

  if (input.userId) {
    const pendingForUser = list.find(
      (order) =>
        order.user_id === input.userId &&
        String(order.status || "").toLowerCase() !== "paid" &&
        String(order.status || "").toLowerCase() !== "paid & cleared"
    );
    if (pendingForUser) return pendingForUser;
  }

  return null;
}

/**
 * Mark order Paid & Cleared. Uses canonical `status: paid` for app filters and
 * stores the display label on `payment_status` / shipping_address when present.
 */
async function markOrderPaidAndCleared(
  order: OrderRow,
  extras: {
    paymentIntentId: string | null;
    checkoutSessionId: string;
  }
): Promise<OrderRow> {
  const supabase = getAdminSupabase();
  const shipping_address = {
    ...(order.shipping_address || {}),
    stripe_payment_intent_id:
      extras.paymentIntentId ||
      order.shipping_address?.stripe_payment_intent_id ||
      null,
    stripe_checkout_session_id: extras.checkoutSessionId,
    payment_status: PAID_CLEARED_LABEL,
  };

  const primaryUpdate = {
    status: PAID_STATUS,
    payment_status: PAID_CLEARED_LABEL,
    shipping_address,
  };

  let { data, error } = await supabase
    .from("orders")
    .update(primaryUpdate)
    .eq("id", order.id)
    .select("*")
    .maybeSingle();

  // Older schemas may not have payment_status — retry without it.
  if (error && /payment_status/i.test(error.message || "")) {
    const fallback = await supabase
      .from("orders")
      .update({ status: PAID_STATUS, shipping_address })
      .eq("id", order.id)
      .select("*")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`Failed to mark order Paid & Cleared: ${error.message}`);
  }

  console.log(
    `[stripe webhook] Order ${order.id} marked as ${PAID_CLEARED_LABEL}`
  );

  return (data as OrderRow) || { ...order, status: PAID_STATUS, shipping_address };
}

async function ensurePaidOrderForSession(input: {
  session: Stripe.Checkout.Session;
  paymentIntentId: string | null;
  userId: string;
  customerEmail: string;
  customerName: string;
  shippingAddress: Record<string, unknown>;
  itemsSummary: string;
  totalAmount: number;
}): Promise<OrderRow> {
  const supabase = getAdminSupabase();
  const createdAt = new Date(
    (input.session.created || Date.now() / 1000) * 1000
  ).toISOString();

  const shipping_address = {
    ...input.shippingAddress,
    email: input.customerEmail,
    full_name: input.customerName,
    stripe_payment_intent_id: input.paymentIntentId,
    stripe_checkout_session_id: input.session.id,
    payment_status: PAID_CLEARED_LABEL,
  };

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    status: PAID_STATUS,
    payment_status: PAID_CLEARED_LABEL,
    total: input.totalAmount,
    items: [
      {
        productName: input.itemsSummary || "Stripe Checkout Order",
        quantity: 1,
        unitPrice: input.totalAmount,
        totalPrice: input.totalAmount,
      },
    ],
    shipping_address,
    created_at: createdAt,
  };

  let insert = await supabase.from("orders").insert(payload).select("*").maybeSingle();

  if (insert.error && /payment_status/i.test(insert.error.message || "")) {
    const { payment_status: _unusedPaymentStatus, ...withoutPaymentStatus } =
      payload;
    void _unusedPaymentStatus;
    insert = await supabase
      .from("orders")
      .insert(withoutPaymentStatus)
      .select("*")
      .maybeSingle();
  }

  if (insert.error || !insert.data) {
    throw new Error(
      `Failed to create paid order: ${insert.error?.message || "no row returned"}`
    );
  }

  console.log(
    `[stripe webhook] Created order ${insert.data.id} as ${PAID_CLEARED_LABEL} for user ${input.userId}`
  );

  return insert.data as OrderRow;
}

async function generateOrderSummaryPdf(order: OrderRow): Promise<Uint8Array> {
  const createdAt = order.created_at || new Date().toISOString();
  const orderPoRef = formatOrderId({
    id: order.id,
    createdAt,
    items: order.items || [],
  });
  const totalUsd = Number(
    order.total_usd ?? order.total_amount ?? order.total ?? 0
  );
  const issueDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const idDigits = String(order.id || "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(-4)
    .toUpperCase();
  const invoiceNumber = `INV-${new Date(createdAt).getFullYear()}-${idDigits || "0000"}`;

  const logo = await fetchPlastipacLogoForPdf();
  if (!logo) {
    console.warn(
      "[stripe webhook] Plastipac logo could not be rasterized — generating PDF without logo."
    );
  }

  const pdfBytes = generateInvoicePdf({
    invoiceNumber,
    orderPoRef,
    issueDate,
    paymentStatus: PAID_CLEARED_LABEL,
    customerName:
      order.customer_name ||
      (order.shipping_address?.full_name as string | undefined) ||
      (order.shipping_address?.name as string | undefined),
    customerCompany:
      order.company_name ||
      (order.shipping_address?.company_name as string | undefined),
    customerEmail:
      order.customer_email ||
      (order.shipping_address?.email as string | undefined),
    items: mapOrderItems(order.items, totalUsd),
    totalUsd,
    logo,
  });

  // Best-effort archive to Supabase Storage (non-fatal if bucket missing).
  try {
    const supabase = getAdminSupabase();
    const path = `orders/${order.id}/${orderPoRef}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(path, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.warn(
        "[stripe webhook] PDF storage upload skipped:",
        uploadError.message
      );
    } else {
      console.log(`[stripe webhook] Order summary PDF stored at invoices/${path}`);
    }
  } catch (storageErr: unknown) {
    const message =
      storageErr instanceof Error ? storageErr.message : String(storageErr);
    console.warn("[stripe webhook] PDF storage unavailable:", message);
  }

  console.log(
    `[stripe webhook] Order summary PDF generated for ${orderPoRef} (${pdfBytes.byteLength} bytes)`
  );

  return pdfBytes;
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
      "[stripe webhook] admin PO email sent for",
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

  const userId = resolveSessionUserId(session);
  const orderIdHint = resolveOrderIdFromSession(session);

  console.log(
    "[stripe webhook] checkout.session.completed",
    JSON.stringify({
      sessionId: session.id,
      userId,
      orderIdHint,
      paymentIntentId,
      paymentStatus: session.payment_status,
    })
  );

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

  const sessionWithShipping = session as Stripe.Checkout.Session & {
    shipping_details?: {
      address?: Stripe.Address | null;
    } | null;
    collected_information?: {
      shipping_details?: {
        address?: Stripe.Address | null;
      } | null;
    } | null;
  };

  const shippingDetails =
    sessionWithShipping.collected_information?.shipping_details?.address ||
    sessionWithShipping.shipping_details?.address ||
    session.customer_details?.address ||
    null;

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

  const totalAmount = centsToUsd(session.amount_total);

  let order = await findOrderForSession({
    orderIdHint,
    paymentIntentId,
    checkoutSessionId: session.id,
    userId,
  });

  if (order) {
    order = await markOrderPaidAndCleared(order, {
      paymentIntentId,
      checkoutSessionId: session.id,
    });
  } else if (userId) {
    order = await ensurePaidOrderForSession({
      session,
      paymentIntentId,
      userId,
      customerEmail,
      customerName,
      shippingAddress: {
        line1: shippingDetails?.line1 || null,
        line2: shippingDetails?.line2 || null,
        city: shippingCity || null,
        state: shippingState || null,
        postal_code: shippingDetails?.postal_code || null,
        country: shippingDetails?.country || null,
      },
      itemsSummary,
      totalAmount,
    });
  } else {
    throw new Error(
      "Unable to correlate Checkout Session to a Plastipac order (missing order_id / userId)."
    );
  }

  // PDF generation is required — failures must surface as HTTP 500 for Stripe retries.
  await generateOrderSummaryPdf(order);

  const poReference =
    orderIdHint ||
    formatOrderId({
      id: order.id,
      createdAt: order.created_at || new Date().toISOString(),
      items: order.items || [],
    });

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
    orderDate: new Date(
      (session.created || Date.now() / 1000) * 1000
    ).toISOString(),
  });

  console.log(
    `[stripe webhook] checkout.session.completed confirmed for order ${order.id} (${PAID_CLEARED_LABEL})`
  );
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const supabase = getAdminSupabase();
  const { data: rows, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Order lookup failed: ${error.message}`);
  }

  const order = (rows || []).find(
    (row: OrderRow) =>
      row.shipping_address?.stripe_payment_intent_id === paymentIntent.id
  ) as OrderRow | undefined;

  if (!order) {
    console.log(
      "[stripe webhook] payment_intent.succeeded — no local order matched:",
      paymentIntent.id
    );
    return;
  }

  await markOrderPaidAndCleared(order, {
    paymentIntentId: paymentIntent.id,
    checkoutSessionId: String(
      order.shipping_address?.stripe_checkout_session_id || ""
    ),
  });
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
      { error: "Webhook Error: Invalid signature" },
      { status: 400 }
    );
  }

  // Raw body required for Stripe signature verification — do not JSON-parse first.
  const body = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: "Webhook Error: Invalid signature" },
      { status: 400 }
    );
  }

  const stripe = getStripe();

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
    const message = error instanceof Error ? error.message : String(error);
    console.error("[stripe webhook] Handler failure (returning 500 for retry):", message);
    return NextResponse.json(
      { error: message || "Webhook handler failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
