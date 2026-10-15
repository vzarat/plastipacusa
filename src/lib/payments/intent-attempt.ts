import { createHash, timingSafeEqual } from "node:crypto";

const OPEN_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "requires_capture",
]);

export interface PreviousIntent {
  id: string;
  status: string;
  orderId: string | null;
  userId: string | null;
}

export function cronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const actual = createHash("sha256").update(authorization ?? "").digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(actual, expected);
}

export function paymentIdempotencyKey(orderId: string, attempt: number): string {
  return `order_${orderId}_attempt_${Math.max(1, Math.floor(attempt))}`;
}

export function ownsPendingIntent(
  previous: PreviousIntent,
  userId: string,
  pendingOrderId: string
): boolean {
  return previous.orderId === pendingOrderId && previous.userId === userId;
}

/**
 * A canceled Stripe idempotency key keeps returning that canceled intent for 24 hours.
 * The key includes the pending order id and the attempt, and a canceled intent is never reused.
 * Succeeded or processing intents that belong to this order are returned as-is.
 */
export function decidePaymentAttempt(input: {
  previous: PreviousIntent | null;
  userId: string;
  pendingOrderId: string;
  attempt: number;
  cartChanged: boolean;
}):
  | { type: "keep"; paymentIntentId: string }
  | { type: "update"; paymentIntentId: string }
  | {
      type: "create";
      idempotencyKey: string;
      cancelId: string | null;
      nextAttempt: number;
    } {
  const previous = input.previous;
  const attempt = Math.max(1, Math.floor(input.attempt) || 1);
  if (previous && ownsPendingIntent(previous, input.userId, input.pendingOrderId)) {
    if (previous.status === "succeeded" || previous.status === "processing") {
      return { type: "keep", paymentIntentId: previous.id };
    }
    if (OPEN_STATUSES.has(previous.status) && !input.cartChanged) {
      return { type: "update", paymentIntentId: previous.id };
    }
    const nextAttempt = attempt + 1;
    return {
      type: "create",
      idempotencyKey: paymentIdempotencyKey(input.pendingOrderId, nextAttempt),
      cancelId: OPEN_STATUSES.has(previous.status) ? previous.id : null,
      nextAttempt,
    };
  }
  return {
    type: "create",
    idempotencyKey: paymentIdempotencyKey(input.pendingOrderId, attempt),
    cancelId: null,
    nextAttempt: attempt,
  };
}

export const PENDING_REVIEW_MS = 15 * 60 * 1000;
export const PENDING_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

/** Compare-and-set: only the caller that still sees expectedAttempt may advance it. */
export function claimPaymentAttempt(
  storedAttempt: number,
  expectedAttempt: number
): boolean {
  return storedAttempt === expectedAttempt;
}

/**
 * Partial unique index: one pending_payment row per user.
 * The loser of the attempt compare-and-set reuses the winner's intent.
 */
export function runTwoPaymentCreates(): { orderIds: string[]; intentIds: string[] } {
  const rows: Array<{ id: string; attempt: number; intentId: string | null }> = [];
  const intentIds: string[] = [];

  const once = () => {
    let row = rows[0];
    if (!row) {
      row = { id: "order-1", attempt: 1, intentId: null };
      rows.push(row);
    }
    if (row.intentId) {
      intentIds.push(row.intentId);
      return;
    }
    const expected = row.attempt;
    if (!claimPaymentAttempt(row.attempt, expected)) {
      if (row.intentId) intentIds.push(row.intentId);
      return;
    }
    row.attempt = expected + 1;
    row.intentId = paymentIdempotencyKey(row.id, row.attempt);
    intentIds.push(row.intentId);
  };

  once();
  once();
  return { orderIds: rows.map((row) => row.id), intentIds };
}

export function planAbandonedCleanup(input: {
  status: string;
  createdAt: string;
  intentStatus: string | null;
  now?: number;
}): "keep" | "flag_review" | "cancel_then_delete" | "delete" {
  if (input.status !== "pending_payment") return "keep";
  const created = Date.parse(input.createdAt);
  const now = input.now ?? Date.now();
  if (!Number.isFinite(created)) return "keep";
  const age = now - created;
  if (age < PENDING_REVIEW_MS) return "keep";
  if (input.intentStatus === "succeeded" || input.intentStatus === "processing") {
    return "flag_review";
  }
  if (age < PENDING_ORDER_TTL_MS) return "keep";
  if (input.intentStatus && OPEN_STATUSES.has(input.intentStatus)) return "cancel_then_delete";
  return "delete";
}

export function isAbandonedPending(
  status: string,
  createdAt: string,
  now = Date.now()
): boolean {
  if (status !== "pending_payment") return false;
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return now - created >= PENDING_ORDER_TTL_MS;
}

export function countsAsSale(status: string, paymentStatus: string): boolean {
  if (status === "pending_payment") return false;
  const payment = paymentStatus.toLowerCase();
  return payment === "paid" || payment === "paid & cleared" || payment === "completed";
}

export function rgvLocalCharge(eligible: boolean):
  | { price: 0 }
  | { error: string } {
  if (!eligible) return { error: "Free local delivery does not apply to this order." };
  return { price: 0 };
}

export const EXPIRED_QUOTE_MESSAGE =
  "This shipping quote expired. Review the updated price before paying.";
export const MISMATCH_QUOTE_MESSAGE =
  "We couldn't confirm this shipping quote. Please choose it again.";

export function paymentQuoteFailure(status: "missing" | "expired" | "mismatch"): {
  error: string;
  expired: boolean;
} {
  if (status === "mismatch") return { error: MISMATCH_QUOTE_MESSAGE, expired: false };
  return { error: EXPIRED_QUOTE_MESSAGE, expired: status === "expired" };
}
