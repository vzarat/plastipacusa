import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { customerLineDescription } from "@/lib/catalog-sku";
import Stripe from "stripe";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { formatOrderId } from "@/lib/utils";
import {
  notifyAdminPurchaseOrder,
  sendOrderConfirmationEmail,
} from "@/lib/email";
import {
  fetchPlastipacLogoForPdf,
  generateInvoicePdf,
  type InvoicePdfItem,
} from "@/lib/invoice-pdf";
import { roundMoney } from "@/lib/sales-tax";
import {
  judgePaymentMatch,
  paymentMismatchReason,
  planPaymentIntentSucceeded,
  runSettlement,
  verifyWebhookSignature,
} from "@/lib/payments/settle-payment";
import { runIdempotentSideEffect, stripeEventSideEffect } from "@/lib/payments/webhook-events";
import { formatFridayDeliveryDate, readFridayDeliveryIso } from "@/lib/shipping/friday-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fridayDeliveryCopy(
  address: Record<string, unknown> | null | undefined,
  metadata?: { friday_delivery_date?: string | null } | null
): string | undefined {
  const iso = readFridayDeliveryIso(
    address?.friday_delivery_date || metadata?.friday_delivery_date
  );
  return iso ? formatFridayDeliveryDate(iso) : undefined;
}

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
      description: customerLineDescription({
        productName: name,
        sku: item?.sku,
      }),
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
  currency?: string | null;
  payment_intent_id?: string | null;
  coupon_id?: string | null;
  items?: Array<{
    sku?: string | null;
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

  const taxAmount = roundMoney(Number(input.session.metadata?.tax_amount || 0));
  const subtotalAmount = roundMoney(Number(input.session.metadata?.subtotal || 0));
  const shippingAmount = roundMoney(
    Number(input.session.metadata?.shipping_amount || 0)
  );

  const shipping_address = {
    ...input.shippingAddress,
    email: input.customerEmail,
    full_name: input.customerName,
    stripe_payment_intent_id: input.paymentIntentId,
    stripe_checkout_session_id: input.session.id,
    payment_status: PAID_CLEARED_LABEL,
    subtotal: subtotalAmount,
    shipping_amount: shippingAmount,
    tax_amount: taxAmount,
    tax_rate: 0.0825,
  };

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    status: PAID_STATUS,
    payment_status: PAID_CLEARED_LABEL,
    subtotal: subtotalAmount,
    shipping: shippingAmount,
    tax: taxAmount,
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

  let nextPayload = { ...payload };
  let insert = await supabase.from("orders").insert(nextPayload).select("*").maybeSingle();

  for (let attempt = 0; attempt < 6 && insert.error; attempt += 1) {
    const message = String(insert.error.message || "");
    const missing =
      message.match(/Could not find the ['"]([a-z0-9_]+)['"] column/i) ||
      message.match(/column ["']?([a-z0-9_]+)["']?/i);
    const column =
      missing?.[1] ||
      (/payment_status/i.test(message) ? "payment_status" : null);
    const unknownColumn =
      /does not exist/i.test(message) ||
      /schema cache/i.test(message) ||
      /payment_status/i.test(message);
    if (!column || !unknownColumn || !(column in nextPayload)) break;
    delete nextPayload[column];
    nextPayload = { ...nextPayload };
    insert = await supabase.from("orders").insert(nextPayload).select("*").maybeSingle();
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
    deliveryDate: fridayDeliveryCopy(order.shipping_address),
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
  shippingPhone?: string;
  itemCount?: number;
  itemsSummary?: string;
  orderDate?: string;
  fridayDeliveryDate?: string;
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
  let metaShip: Record<string, string> = {};
  try {
    metaShip = JSON.parse(String(session.metadata?.shipping_address || "{}"));
  } catch {
    metaShip = {};
  }

  const shippingPhone =
    session.customer_details?.phone ||
    metaShip.phone ||
    String(session.metadata?.shipping_phone || "") ||
    undefined;

  const structuredShipping = {
    fullName: customerName || metaShip.full_name || undefined,
    line1: shippingDetails?.line1 || metaShip.line1 || undefined,
    line2: shippingDetails?.line2 || metaShip.line2 || undefined,
    city: shippingCity || metaShip.city || undefined,
    state: shippingState || metaShip.state || undefined,
    postalCode:
      shippingDetails?.postal_code || metaShip.postal_code || undefined,
    phone: shippingPhone,
  };

  const shippingAddressSummary = [
    structuredShipping.fullName,
    [structuredShipping.line1, structuredShipping.line2]
      .filter(Boolean)
      .join(", "),
    [structuredShipping.city, structuredShipping.state, structuredShipping.postalCode]
      .filter(Boolean)
      .join(", "),
    structuredShipping.phone ? `Phone: ${structuredShipping.phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

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
        full_name: structuredShipping.fullName || null,
        line1: structuredShipping.line1 || null,
        street: structuredShipping.line1 || null,
        line2: structuredShipping.line2 || null,
        city: structuredShipping.city || null,
        state: structuredShipping.state || null,
        postal_code: structuredShipping.postalCode || null,
        zip: structuredShipping.postalCode || null,
        phone: structuredShipping.phone || null,
        country: shippingDetails?.country || metaShip.country || "US",
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
  const pdfBytes = await generateOrderSummaryPdf(order);

  const poReference =
    orderIdHint ||
    formatOrderId({
      id: order.id,
      createdAt: order.created_at || new Date().toISOString(),
      items: order.items || [],
    });

  const resolvedCustomerEmail =
    customerEmail ||
    order.customer_email ||
    (order.shipping_address?.email as string | undefined) ||
    "";

  try {
    const emailLineItems =
      Array.isArray(order.items) && order.items.length > 0
        ? mapOrderItems(order.items, totalAmount)
        : lineItems.map((item) => ({
            description: String(item.description || "Plastipac Product"),
            quantity: Number(item.quantity || 1) || 1,
          }));

    await sendOrderConfirmationEmail({
      orderId: poReference,
      customerName,
      customerEmail: resolvedCustomerEmail,
      customerCompany,
      totalAmountUsd: totalAmount,
      itemsSummary,
      itemCount,
      shippingAddressSummary: shippingAddressSummary || undefined,
      shippingAddress: structuredShipping,
      orderDate: new Date(
        (session.created || Date.now() / 1000) * 1000
      ).toISOString(),
      lineItems: emailLineItems,
      fridayDeliveryDate: fridayDeliveryCopy(order.shipping_address, session.metadata),
      pdfBytes,
    });
  } catch (emailErr: unknown) {
    const message =
      emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error(
      "[stripe webhook] Order confirmation email failed (payment still OK):",
      message
    );
  }

  try {
    await dispatchAdminPoEmail({
      orderId: poReference,
      customerName,
      customerEmail: resolvedCustomerEmail || customerEmail,
      customerCompany,
      totalAmount,
      shippingState,
      shippingCity,
      shippingAddressSummary: shippingAddressSummary || undefined,
      shippingPhone,
      itemCount,
      itemsSummary,
      orderDate: new Date(
        (session.created || Date.now() / 1000) * 1000
      ).toISOString(),
      fridayDeliveryDate: fridayDeliveryCopy(order.shipping_address, session.metadata),
    });
  } catch (adminEmailErr: unknown) {
    const message =
      adminEmailErr instanceof Error ? adminEmailErr.message : String(adminEmailErr);
    console.error(
      "[stripe webhook] Admin PO email failed (payment still OK):",
      message
    );
  }

  console.log(
    `[stripe webhook] checkout.session.completed confirmed for order ${order.id} (${PAID_CLEARED_LABEL})`
  );
}

function paymentIntentLineItems(paymentIntent: Stripe.PaymentIntent) {
  try {
    const parsed = JSON.parse(String(paymentIntent.metadata?.line_items || "[]"));
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((item) => {
      const quantity = Math.max(1, Number(item.q || item.quantity || 1));
      const unitPrice = Number(item.u || item.unitPrice || 0);
      return {
        productName: String(item.n || item.productName || "Plastipac Product"),
        quantity,
        unitPrice,
        totalPrice: Number((unitPrice * quantity).toFixed(2)),
      };
    });
  } catch {
    return null;
  }
}

async function ensurePaidOrderForPaymentIntent(
  paymentIntent: Stripe.PaymentIntent
): Promise<OrderRow> {
  const supabase = getAdminSupabase();
  const meta = paymentIntent.metadata || {};
  const totalAmount = centsToUsd(
    paymentIntent.amount_received || paymentIntent.amount
  );
  const subtotalAmount = roundMoney(Number(meta.subtotal || 0));
  const shippingAmount = roundMoney(
    Number(meta.shipping_amount || meta.shipping_cost || 0)
  );
  const taxAmount = roundMoney(Number(meta.tax_amount || 0));
  const discountAmount = roundMoney(Number(meta.discount_amount || 0));
  const userId = String(meta.user_id || meta.userId || "").trim();
  let parsedAddress: Record<string, unknown> = {};
  try {
    parsedAddress = JSON.parse(String(meta.shipping_address || "{}"));
  } catch {
    parsedAddress = {};
  }

  const shippingAddress = {
    ...parsedAddress,
    full_name:
      paymentIntent.shipping?.name ||
      parsedAddress.full_name ||
      meta.customer_name ||
      null,
    email: paymentIntent.receipt_email || meta.customer_email || null,
    line1: paymentIntent.shipping?.address?.line1 || parsedAddress.line1 || null,
    line2: paymentIntent.shipping?.address?.line2 || parsedAddress.line2 || null,
    city: paymentIntent.shipping?.address?.city || parsedAddress.city || null,
    state: paymentIntent.shipping?.address?.state || parsedAddress.state || null,
    postal_code:
      paymentIntent.shipping?.address?.postal_code ||
      parsedAddress.postal_code ||
      null,
    phone: paymentIntent.shipping?.phone || meta.shipping_phone || null,
    country: paymentIntent.shipping?.address?.country || "US",
    stripe_payment_intent_id: paymentIntent.id,
    shipping_method: meta.shipping_method || null,
    shipping_address_id: meta.shipping_address_id || null,
    shipping_cost: shippingAmount,
    tax_amount: taxAmount,
    tax_rate: Number(meta.tax_rate || 0.0825),
    discount_amount: discountAmount,
    subtotal: subtotalAmount,
    tax_exempt_requested: meta.tax_exempt_requested === "true",
    metadata: {
      taxExemptRequested: meta.tax_exempt_requested === "true",
    },
  };

  const payload: Record<string, unknown> = {
    status: PAID_STATUS,
    payment_status: PAID_CLEARED_LABEL,
    payment_intent_id: paymentIntent.id,
    subtotal: subtotalAmount,
    shipping: shippingAmount,
    shipping_cost: shippingAmount,
    shipping_method: meta.shipping_method || null,
    tax: taxAmount,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    tax_exempt_requested: meta.tax_exempt_requested === "true",
    total: totalAmount,
    total_amount: totalAmount,
    items: paymentIntentLineItems(paymentIntent) || [
      {
        productName: meta.items_summary || "Plastipac Order",
        quantity: 1,
        unitPrice: totalAmount,
        totalPrice: totalAmount,
      },
    ],
    shipping_address: shippingAddress,
    created_at: new Date().toISOString(),
  };
  if (userId) payload.user_id = userId;
  if (meta.shipping_address_id) {
    payload.shipping_address_id = meta.shipping_address_id;
  }

  let nextPayload = { ...payload };
  let insert = await supabase.from("orders").insert(nextPayload).select("*").maybeSingle();
  for (let attempt = 0; attempt < 8 && insert.error; attempt += 1) {
    const message = String(insert.error.message || "");
    const missing =
      message.match(/Could not find the ['"]([a-z0-9_]+)['"] column/i) ||
      message.match(/column ["']?([a-z0-9_]+)["']?/i);
    const column = missing?.[1];
    const unknownColumn =
      /does not exist/i.test(message) || /schema cache/i.test(message);
    if (!column || !unknownColumn || !(column in nextPayload)) break;
    delete nextPayload[column];
    nextPayload = { ...nextPayload };
    insert = await supabase.from("orders").insert(nextPayload).select("*").maybeSingle();
  }

  if (insert.error || !insert.data) {
    throw new Error(
      `Failed to create paid order: ${insert.error?.message || "no row returned"}`
    );
  }

  return insert.data as OrderRow;
}

async function notifyPaidPaymentIntent(
  order: OrderRow,
  paymentIntent: Stripe.PaymentIntent
) {
  const meta = paymentIntent.metadata || {};
  const customerEmail =
    paymentIntent.receipt_email ||
    String(meta.customer_email || "") ||
    String(order.shipping_address?.email || "");
  const customerName =
    paymentIntent.shipping?.name ||
    String(meta.customer_name || "") ||
    String(order.shipping_address?.full_name || "Customer");
  const customerCompany =
    String(meta.company_name || order.shipping_address?.line2 || "") ||
    "Plastipac USA Customer";
  const totalAmount = centsToUsd(
    paymentIntent.amount_received || paymentIntent.amount
  );
  const address = order.shipping_address || {};
  const shippingAddressSummary = [
    customerName,
    [address.line1, address.line2].filter(Boolean).join(", "),
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.phone ? `Phone: ${address.phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSummary =
    items
      .map(
        (item) =>
          `${item.quantity || 1}× ${customerLineDescription({
            productName: item.productName || item.name || "Product",
            sku: item.sku,
          })}`
      )
      .join("; ") ||
    String(meta.items_summary || "Plastipac Order");
  const poReference = formatOrderId({
    id: order.id,
    createdAt: order.created_at || new Date().toISOString(),
    items,
  });

  const pdfBytes = await generateOrderSummaryPdf(order);
  await sendOrderConfirmationEmail({
    orderId: poReference,
    customerName,
    customerEmail,
    customerCompany,
    totalAmountUsd: totalAmount,
    itemsSummary,
    itemCount: items.length || 1,
    shippingAddressSummary,
    shippingAddress: {
      fullName: customerName,
      line1: String(address.line1 || "") || undefined,
      line2: String(address.line2 || "") || undefined,
      city: String(address.city || "") || undefined,
      state: String(address.state || "") || undefined,
      postalCode: String(address.postal_code || "") || undefined,
      phone: String(address.phone || "") || undefined,
    },
    orderDate: order.created_at || new Date().toISOString(),
    lineItems: mapOrderItems(items, totalAmount),
    fridayDeliveryDate: fridayDeliveryCopy(address, meta),
    pdfBytes,
  });
  await dispatchAdminPoEmail({
    orderId: poReference,
    customerName,
    customerEmail,
    customerCompany,
    totalAmount,
    shippingState: String(address.state || "") || undefined,
    shippingCity: String(address.city || "") || undefined,
    shippingAddressSummary,
    shippingPhone: String(address.phone || "") || undefined,
    itemCount: items.length || 1,
    itemsSummary,
    orderDate: order.created_at || new Date().toISOString(),
    fridayDeliveryDate: fridayDeliveryCopy(address, meta),
  });
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  const supabase = getAdminSupabase();
  const { data: matched } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_intent_id", paymentIntent.id)
    .maybeSingle();

  let order = (matched || null) as OrderRow | null;
  // Lookup is by payment_intent_id only. pending_payment and payment_review both settle when the payment matches.

  if (!order) {
    const { data: rows, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      throw new Error(`Order lookup failed: ${error.message}`);
    }

    order =
      ((rows || []).find(
        (row: OrderRow) =>
          row.shipping_address?.stripe_payment_intent_id === paymentIntent.id
      ) as OrderRow | undefined) || null;
  }

  const orderTotalCents = order
    ? Math.round(Number(order.total_amount ?? order.total ?? 0) * 100)
    : 0;
  const amountReceived = paymentIntent.amount_received || 0;
  const plan = planPaymentIntentSucceeded({
    order: order
      ? {
          status: String(order.status || ""),
          totalCents: orderTotalCents,
          currency: String((order as OrderRow & { currency?: string }).currency || "usd"),
          paymentIntentId: String(order.payment_intent_id || ""),
        }
      : null,
    amountReceived,
    currency: paymentIntent.currency || "",
    paymentIntentId: paymentIntent.id,
  });

  if (plan.action === "insert_unmatched") {
    const recorded = await supabase.rpc("record_unmatched_payment_intent", {
      p_payment_intent_id: paymentIntent.id,
      p_amount_received_cents: amountReceived,
    });
    if (recorded.error) {
      throw new Error(recorded.error.message);
    }
    throw new Error("No order was stored for this PaymentIntent.");
  }

  if (order && (plan.action === "settle" || plan.action === "flag_unpaid")) {
    const matchInput = {
      amountReceived,
      currency: paymentIntent.currency || "",
      paymentIntentId: paymentIntent.id,
      orderTotalCents,
      orderCurrency: String((order as OrderRow & { currency?: string }).currency || "usd"),
      orderPaymentIntentId: String(order.payment_intent_id || ""),
    };
    const match = judgePaymentMatch(matchInput);
    const mismatchReason = paymentMismatchReason(matchInput);
    const outcome = await runSettlement(match, {
      isEventProcessed: async () => {
        const { data } = await supabase
          .from("stripe_webhook_events")
          .select("event_id")
          .eq("event_id", eventId)
          .maybeSingle();
        return Boolean(data);
      },
      markPaidIfUnpaid: async () => {
        const result = await supabase
          .from("orders")
          .update({
            status: PAID_STATUS,
            payment_status: PAID_CLEARED_LABEL,
            booking_status: "needs_booking",
            fulfillment_status: "unfulfilled",
          })
          .eq("id", order!.id)
          .neq("payment_status", PAID_CLEARED_LABEL)
          .select("id");
        if (result.error) return "failed";
        if (result.data && result.data.length > 0) return "updated";
        return "already_paid";
      },
      flagReview: async () => {
        const result = await supabase
          .from("orders")
          .update({
            status: "payment_review",
            payment_review: true,
            payment_review_reason: mismatchReason,
            amount_expected_cents: orderTotalCents,
            amount_received_cents: amountReceived,
          })
          .eq("id", order!.id);
        return result.error ? "failed" : "ok";
      },
      recordEvent: async () => {
        const { error } = await supabase.from("stripe_webhook_events").upsert(
          { event_id: eventId },
          { onConflict: "event_id", ignoreDuplicates: true }
        );
        if (error) throw new Error(error.message);
      },
      applyPaidEffects: async () => {
        const rpc = await supabase.rpc("settle_paid_order", { p_order_id: String(order!.id) });
        if (rpc.error) return "failed";
        revalidatePath("/");
        revalidatePath("/products", "layout");
        return "done";
      },
      sendConfirmation: async () => {
        const claim = await supabase
          .from("orders")
          .update({ confirmation_sent_at: new Date().toISOString() })
          .eq("id", order!.id)
          .is("confirmation_sent_at", null)
          .select("id");
        if (claim.error) return "failed";
        if (!claim.data || claim.data.length === 0) return "already_sent";
        try {
          await notifyPaidPaymentIntent(order!, paymentIntent);
          return "sent";
        } catch (notifyError: unknown) {
          await supabase.from("orders").update({ confirmation_sent_at: null }).eq("id", order!.id);
          const message = notifyError instanceof Error ? notifyError.message : String(notifyError);
          console.error("[stripe webhook] payment confirmation email/PDF failed:", message);
          return "failed";
        }
      },
    });
    if (outcome === "incomplete") {
      throw new Error("Payment settlement did not finish.");
    }
    return;
  }
}

async function eventAlreadyProcessed(eventId: string): Promise<boolean> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function recordWebhookEvent(eventId: string): Promise<void> {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from("stripe_webhook_events").upsert(
    { event_id: eventId },
    { onConflict: "event_id", ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
}

function paymentIntentIdFrom(object: {
  id?: string;
  object?: string;
  payment_intent?: string | { id?: string } | null;
}): string | null {
  if (object.object === "payment_intent" && object.id) return object.id;
  const paymentIntent = object.payment_intent;
  if (typeof paymentIntent === "string") return paymentIntent;
  if (paymentIntent && typeof paymentIntent === "object" && paymentIntent.id) return paymentIntent.id;
  return null;
}

async function handleStripeSideEffect(event: Stripe.Event): Promise<void> {
  const effect = stripeEventSideEffect(event.type);
  if (effect.kind === "other") return;
  const paymentIntentId = paymentIntentIdFrom(
    event.data.object as {
      id?: string;
      object?: string;
      payment_intent?: string | { id?: string } | null;
    }
  );
  if (!paymentIntentId) throw new Error("Stripe event has no PaymentIntent.");

  const outcome = await runIdempotentSideEffect({
    alreadyProcessed: await eventAlreadyProcessed(event.id),
    apply: async () => {
      if (effect.kind === "pending_notice") {
        console.log(`[stripe webhook] ${effect.label} for ${paymentIntentId}; order stays pending.`);
        return "ok";
      }
      const supabase = getAdminSupabase();
      const updated = await supabase
        .from("orders")
        .update({
          payment_review: true,
          payment_review_reason: effect.reason,
        })
        .eq("payment_intent_id", paymentIntentId)
        .select("id");
      if (updated.error || !updated.data || updated.data.length === 0) return "failed";
      return "ok";
    },
    record: () => recordWebhookEvent(event.id),
  });
  if (outcome === "failed") throw new Error("Stripe event was not recorded.");
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
  // STRIPE_WEBHOOK_SECRET is the signing secret of the live-mode webhook endpoint.
  const body = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = verifyWebhookSignature(
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
        await handlePaymentIntentSucceeded(paymentIntent, event.id);
        break;
      }
      case "payment_intent.payment_failed":
      case "payment_intent.canceled":
      case "charge.refunded":
      case "charge.dispute.created": {
        await handleStripeSideEffect(event);
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
