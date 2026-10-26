import Stripe from "stripe";

export type SettlementOutcome =
  | "duplicate_event"
  | "already_paid"
  | "mismatch"
  | "paid"
  | "incomplete";

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): Stripe.Event {
  return Stripe.webhooks.constructEvent(rawBody, signature, secret);
}

export function paymentMismatchReason(input: {
  amountReceived: number;
  currency: string;
  paymentIntentId: string;
  orderTotalCents: number;
  orderCurrency: string;
  orderPaymentIntentId: string;
}): string | null {
  if (input.currency.toLowerCase() !== input.orderCurrency.toLowerCase()) {
    return `Currency ${input.currency} does not match ${input.orderCurrency}.`;
  }
  if (input.paymentIntentId !== input.orderPaymentIntentId) {
    return `PaymentIntent ${input.paymentIntentId} does not match ${input.orderPaymentIntentId}.`;
  }
  if (input.amountReceived !== input.orderTotalCents) {
    return `Amount received ${input.amountReceived} does not match expected ${input.orderTotalCents}.`;
  }
  return null;
}

/**
 * products.stock_quantity is full pallets, including a fraction for loose boxes and half pallets.
 * NULL stock is untracked.
 * A shortage keeps status paid and sets payment_review. Status payment_review is only for an unpaid order.
 */
/** Null stock is not tracked. A short count is flagged and is not decremented below zero. */
export function stockLineOutcome(
  onHand: number | null,
  quantity: number
): "untracked" | "decrement" | "short" {
  if (onHand == null) return "untracked";
  if (onHand < quantity) return "short";
  return "decrement";
}

export type SucceededPaymentPlan =
  | { action: "settle"; clearPaymentReview: true; status: "paid" }
  | { action: "flag_unpaid"; clearPaymentReview: false; status: "payment_review" }
  | { action: "insert_unmatched"; status: "payment_review" };

/**
 * A row found by payment_intent_id is settled when amount, currency, and id match.
 * That includes pending_payment and payment_review. Settlement clears payment_review.
 * No row at all inserts the unmatched review row and does not build an order from metadata.
 */
export function planPaymentIntentSucceeded(input: {
  order: {
    status: string;
    totalCents: number;
    currency: string;
    paymentIntentId: string;
  } | null;
  amountReceived: number;
  currency: string;
  paymentIntentId: string;
}): SucceededPaymentPlan {
  if (!input.order) return { action: "insert_unmatched", status: "payment_review" };
  const mismatch = paymentMismatchReason({
    amountReceived: input.amountReceived,
    currency: input.currency,
    paymentIntentId: input.paymentIntentId,
    orderTotalCents: input.order.totalCents,
    orderCurrency: input.order.currency,
    orderPaymentIntentId: input.order.paymentIntentId,
  });
  if (mismatch) return { action: "flag_unpaid", clearPaymentReview: false, status: "payment_review" };
  return { action: "settle", clearPaymentReview: true, status: "paid" };
}

/** Stock shortage stays paid. payment_review status is only for an order that is still unpaid. */
export function stockShortageOrderStatus(): "paid" {
  return "paid";
}

export function judgePaymentMatch(input: {
  amountReceived: number;
  currency: string;
  paymentIntentId: string;
  orderTotalCents: number;
  orderCurrency: string;
  orderPaymentIntentId: string;
}): "match" | "mismatch" {
  return paymentMismatchReason(input) ? "mismatch" : "match";
}

export function paidSideEffects(transitioned: boolean): Array<"stock" | "coupon"> {
  return transitioned ? ["stock", "coupon"] : [];
}

export interface PaidEffectLedger {
  inventorySettled: boolean;
  couponSettled: boolean;
}

/**
 * Stock and coupon each apply at most once per order.
 * A failure after the paid update leaves the unfinished effect for the retry.
 */
export function applyPaidEffectLedger(
  ledger: PaidEffectLedger,
  failAfter: "inventory" | "coupon" | null = null
): { ledger: PaidEffectLedger; status: "done" | "failed"; applied: Array<"stock" | "coupon"> } {
  const next = { ...ledger };
  const applied: Array<"stock" | "coupon"> = [];
  if (!next.inventorySettled) {
    next.inventorySettled = true;
    applied.push("stock");
    if (failAfter === "inventory") return { ledger: next, status: "failed", applied };
  }
  if (!next.couponSettled) {
    next.couponSettled = true;
    applied.push("coupon");
    if (failAfter === "coupon") return { ledger: next, status: "failed", applied };
  }
  return { ledger: next, status: "done", applied };
}

export interface SettlementIO {
  isEventProcessed: () => Promise<boolean>;
  markPaidIfUnpaid: () => Promise<"updated" | "already_paid" | "failed">;
  flagReview: () => Promise<"ok" | "failed">;
  recordEvent: () => Promise<void>;
  applyPaidEffects: () => Promise<"done" | "failed">;
  sendConfirmation: () => Promise<"sent" | "already_sent" | "failed">;
}

/**
 * Paid update, stock, and coupon are idempotent per order.
 * The confirmation email runs only after those succeed, and a second call does not send it again.
 * The Stripe event id is recorded last, so a failure is retried and finished.
 */
export async function runSettlement(
  match: "match" | "mismatch",
  io: SettlementIO
): Promise<SettlementOutcome> {
  if (await io.isEventProcessed()) return "duplicate_event";
  if (match === "mismatch") {
    const flagged = await io.flagReview();
    if (flagged !== "ok") return "incomplete";
    await io.recordEvent();
    return "mismatch";
  }
  const marked = await io.markPaidIfUnpaid();
  if (marked === "failed") return "incomplete";
  const effects = await io.applyPaidEffects();
  if (effects === "failed") return "incomplete";
  const email = await io.sendConfirmation();
  if (email === "failed") return "incomplete";
  await io.recordEvent();
  return marked === "updated" ? "paid" : "already_paid";
}
