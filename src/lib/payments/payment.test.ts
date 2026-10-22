import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Stripe from "stripe";
import {
  couponBlockReason,
  toCatalogCheckoutVariant,
  totalsFromCartLines,
  totalsFromCatalog,
} from "@/lib/checkout-pricing";
import {
  countsAsSale,
  cronAuthorized,
  decidePaymentAttempt,
  EXPIRED_QUOTE_MESSAGE,
  isAbandonedPending,
  MISMATCH_QUOTE_MESSAGE,
  paymentIdempotencyKey,
  paymentQuoteFailure,
  planAbandonedCleanup,
  rgvLocalCharge,
  runTwoPaymentCreates,
} from "@/lib/payments/intent-attempt";
import {
  applyPaidEffectLedger,
  judgePaymentMatch,
  planPaymentIntentSucceeded,
  stockShortageOrderStatus,
  paymentMismatchReason,
  stockLineOutcome,
  paidSideEffects,
  runSettlement,
  verifyWebhookSignature,
} from "@/lib/payments/settle-payment";
import { runIdempotentSideEffect, stripeEventSideEffect } from "@/lib/payments/webhook-events";
import { freeRgvDelivery } from "@/lib/shipping/rgv-delivery";
import { judgeStoredQuote } from "@/lib/shipping/quote-cache";

const ORDER = "order-1";
const USER = "user-1";

describe("shared checkout pricing", () => {
  const variants = [
    {
      sku: "M-20",
      price: 40,
      boxes_count: 1,
      product_id: "machine-1",
      products: {
        slug: "machine-20",
        application: "machine",
        name: "Machine 20",
        width_inches: 20,
        gauge: 80,
      },
    },
  ];
  const coupon = {
    id: "coupon-1",
    code: "SAVE10",
    discountPercent: 10,
    targetType: "global" as const,
    targetValue: null,
  };

  it("gives the cart display and the server the same subtotal, discount, and total", () => {
    const requested = [{ sku: "M-20", quantity: 2, clientUnitPrice: 1, clientTotal: 1 }];
    const server = totalsFromCatalog(requested, variants, coupon, 25);
    const cart = totalsFromCartLines(server.lines, coupon, 25);
    assert.equal(server.subtotal, 80);
    assert.equal(cart.subtotal, server.subtotal);
    assert.equal(cart.discount, server.discount);
    assert.equal(cart.total, server.total);
    assert.notEqual(server.total, 1);
  });

  it("ignores a client-sent amount", () => {
    const clientAmountCents = 100;
    const server = totalsFromCatalog([{ sku: "M-20", quantity: 1 }], variants, null, 0);
    const charged = Math.round(server.total * 100);
    assert.equal(charged, 4000 + Math.round(server.tax * 100));
    assert.notEqual(charged, clientAmountCents);
  });

  it("prices a live catalog row that stores price_usd and a product title", () => {
    const row = {
      sku: "15-40-1500-64",
      price_usd: 21.2,
      boxes_count: null,
      rolls_count: 256,
      product_id: "film-15",
      title: "64 BOXES = 256 ROLLS",
    };
    const product = { id: "film-15", title: "STRETCH FILM 15\" x 40 GA x 1500 FT", slug: "15-40-1500", type: "hand", width_inches: 15, gauge: 40 };
    const variant = toCatalogCheckoutVariant(row, product);
    const priced = totalsFromCatalog([{ sku: "15-40-1500-64", quantity: 1 }], [variant], null, 0);
    assert.equal(priced.lines[0]?.boxUnitPrice, 21.2);
    assert.equal(priced.subtotal, 1356.8);
    assert.equal(priced.lines[0]?.productName, product.title);
  });

  it("prices two 16-box lines at the 16-box rate, not the combined 32-box rate", () => {
    const hand = [
      { sku: "H-1", price: 28.21, boxes_count: 1, product_id: "hand-1", products: { application: "hand", name: "Hand", slug: "hand" } },
      { sku: "H-16A", price: 25.65, boxes_count: 16, product_id: "hand-1", products: { application: "hand", name: "Hand", slug: "hand" } },
      { sku: "H-16B", price: 25.65, boxes_count: 16, product_id: "hand-1", products: { application: "hand", name: "Hand", slug: "hand" } },
      { sku: "H-32", price: 23.32, boxes_count: 32, product_id: "hand-1", products: { application: "hand", name: "Hand", slug: "hand" } },
      { sku: "H-64", price: 21.2, boxes_count: 64, product_id: "hand-1", products: { application: "hand", name: "Hand", slug: "hand" } },
    ];
    const two = totalsFromCatalog(
      [
        { sku: "H-16A", quantity: 1 },
        { sku: "H-16B", quantity: 1 },
      ],
      hand,
      null,
      0
    );
    assert.equal(two.lines[0].boxUnitPrice, 25.65);
    assert.equal(two.lines[1].boxUnitPrice, 25.65);
    assert.equal(two.lines[0].boxes, 16);
    assert.equal(two.lines[1].boxes, 16);
    assert.equal(two.subtotal, 820.8);
    assert.equal(totalsFromCatalog([{ sku: "H-1", quantity: 1 }], hand, null, 0).lines[0].boxUnitPrice, 28.21);
    assert.equal(totalsFromCatalog([{ sku: "H-32", quantity: 1 }], hand, null, 0).lines[0].boxUnitPrice, 23.32);
    assert.equal(totalsFromCatalog([{ sku: "H-64", quantity: 1 }], hand, null, 0).lines[0].boxUnitPrice, 21.2);
  });

  it("prices a saved FEL cart from the current ELT-SF catalog rows", () => {
    const film = {
      application: "hand",
      name: 'STRETCH FILM 15" x 40 GA x 1500 FT',
      slug: "force-hand-film-15-40-1500",
      width_inches: 15,
      gauge: 40,
    };
    const variants = [
      { sku: "ELT-SF154015-1B", price: 28.21, boxes_count: 1, product_id: "film-15", products: film },
      { sku: "ELT-SF154015-16B", price: 25.65, boxes_count: 16, product_id: "film-15", products: film },
      { sku: "ELT-SF154015-32B", price: 23.32, boxes_count: 32, product_id: "film-15", products: film },
      { sku: "ELT-SF154015-64B", price: 21.2, boxes_count: 64, product_id: "film-15", products: film },
    ];
    const priced = totalsFromCatalog(
      [
        { sku: "FEL-154015-1B", quantity: 1 },
        { sku: "FEL-154015-64B", quantity: 1 },
      ],
      variants,
      null,
      0
    );
    assert.equal(priced.lines[0].sku, "ELT-SF154015-1B");
    assert.equal(priced.lines[0].boxUnitPrice, 28.21);
    assert.equal(priced.lines[0].totalPrice, 28.21);
    assert.equal(priced.lines[1].sku, "ELT-SF154015-64B");
    assert.equal(priced.lines[1].boxUnitPrice, 21.2);
    assert.equal(priced.lines[1].totalPrice, 1356.8);
    assert.equal(priced.subtotal, 1385.01);
  });

  it("uses the priced elite row when an old FEL row has no price", () => {
    const film = { application: "hand", name: "Film", slug: "film", width_inches: 15, gauge: 40 };
    const priced = totalsFromCatalog(
      [{ sku: "FEL-154015-1B", quantity: 1 }],
      [
        { sku: "FEL-154015-1B", price: null, boxes_count: 1, product_id: "film-15", products: film },
        { sku: "ELT-SF154015-1B", price: 28.21, boxes_count: 1, product_id: "film-15", products: film },
      ],
      null,
      0
    );
    assert.equal(priced.lines[0].sku, "ELT-SF154015-1B");
    assert.equal(priced.lines[0].totalPrice, 28.21);
  });

  it("prices saved standard and machine SKUs from the current catalog codes", () => {
    const standard = totalsFromCatalog(
      [{ sku: "FST-188010-64B", quantity: 1 }],
      [
        {
          sku: "STD-SF188010-64B",
          price: 21.2,
          boxes_count: 64,
          product_id: "std-18",
          products: {
            application: "hand",
            name: 'STRETCH FILM 18" x 80 GA x 1000 FT',
            slug: "stretch-film-18",
            width_inches: 18,
            gauge: 80,
          },
        },
      ],
      null,
      0
    );
    assert.equal(standard.lines[0].sku, "STD-SF188010-64B");
    assert.equal(standard.lines[0].totalPrice, 1356.8);

    const machine = totalsFromCatalog(
      [{ sku: "HPFSF205170-HLP", quantity: 1 }],
      [
        {
          sku: "HPF-SF205170-HLP",
          price: 1016.8,
          boxes_count: 0,
          product_id: "machine-20",
          products: {
            application: "machine",
            name: 'STRETCH FILM 20" x 51 GA x 7000 FT',
            slug: "stretch-film-20",
            width_inches: 20,
            gauge: 51,
          },
        },
      ],
      null,
      0
    );
    assert.equal(machine.lines[0].sku, "HPF-SF205170-HLP");
    assert.equal(machine.lines[0].unitPrice, 1016.8);
  });

  it("rejects an invalid or expired coupon", () => {
    const now = Date.parse("2026-10-15T00:00:00Z");
    assert.equal(
      couponBlockReason(
        { is_active: true, expires_at: "2026-10-01T00:00:00Z", max_uses: null, used_count: 0 },
        "buyer@example.com",
        now
      ),
      "This promo code has expired."
    );
    assert.equal(
      couponBlockReason(
        { is_active: false, expires_at: null, max_uses: null, used_count: 0 },
        "buyer@example.com",
        now
      ),
      "This promo code is inactive."
    );
  });
});

describe("payment intent attempts", () => {
  it("creates a usable intent when the same cart is retried after a cancel", () => {
    const canceled = decidePaymentAttempt({
      previous: { id: "pi_old", status: "canceled", orderId: ORDER, userId: USER },
      userId: USER,
      pendingOrderId: ORDER,
      attempt: 1,
      cartChanged: false,
    });
    assert.equal(canceled.type, "create");
    if (canceled.type !== "create") return;
    assert.equal(canceled.cancelId, null);
    assert.equal(canceled.nextAttempt, 2);
    assert.equal(canceled.idempotencyKey, paymentIdempotencyKey(ORDER, 2));
    assert.notEqual(canceled.idempotencyKey, paymentIdempotencyKey(ORDER, 1));
  });

  it("does not cancel or duplicate a previous intent that already succeeded", () => {
    const decision = decidePaymentAttempt({
      previous: { id: "pi_paid", status: "succeeded", orderId: ORDER, userId: USER },
      userId: USER,
      pendingOrderId: ORDER,
      attempt: 2,
      cartChanged: true,
    });
    assert.equal(decision.type, "keep");
    if (decision.type !== "keep") return;
    assert.equal(decision.paymentIntentId, "pi_paid");
    assert.equal("cancelId" in decision, false);
  });

  it("recreates the PaymentIntent when the selected option changes", () => {
    const decision = decidePaymentAttempt({
      previous: {
        id: "pi_open",
        status: "requires_payment_method",
        orderId: ORDER,
        userId: USER,
      },
      userId: USER,
      pendingOrderId: ORDER,
      attempt: 1,
      cartChanged: true,
    });
    assert.equal(decision.type, "create");
    if (decision.type !== "create") return;
    assert.equal(decision.cancelId, "pi_open");
    assert.equal(decision.nextAttempt, 2);
  });

  it("two simultaneous createPaymentIntent calls share one order and one usable intent", () => {
    const result = runTwoPaymentCreates();
    assert.equal(result.orderIds.length, 1);
    assert.equal(new Set(result.intentIds).size, 1);
    assert.match(result.intentIds[0], /^order_order-1_attempt_/);
  });

  it("does not cancel an intent that belongs to someone else", () => {
    const decision = decidePaymentAttempt({
      previous: {
        id: "pi_other",
        status: "requires_payment_method",
        orderId: "order-other",
        userId: "user-other",
      },
      userId: USER,
      pendingOrderId: ORDER,
      attempt: 1,
      cartChanged: true,
    });
    assert.equal(decision.type, "create");
    if (decision.type !== "create") return;
    assert.equal(decision.cancelId, null);
  });
});

describe("stored quote and local delivery at payment", () => {
  const base = {
    found: true,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    destinationZip: "78572",
    weightLbs: 100,
    palletCount: 1,
    itemsHash: "hash-a",
    zip: "78572",
    freightWeightLbs: 100,
    freightPalletCount: 1,
    freightItemsHash: "hash-a",
  };

  it("rejects an expired quote with the review sentence", () => {
    const verdict = judgeStoredQuote({
      ...base,
      expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
    });
    assert.equal(verdict.status, "expired");
    const failure = paymentQuoteFailure("expired");
    assert.equal(failure.error, EXPIRED_QUOTE_MESSAGE);
    assert.equal(failure.expired, true);
  });

  it("rejects a changed cart for ZIP, weight, pallets, and items_hash", () => {
    for (const patch of [
      { zip: "77001" },
      { freightWeightLbs: 140 },
      { freightPalletCount: 2 },
      { freightItemsHash: "hash-b" },
    ]) {
      const verdict = judgeStoredQuote({ ...base, ...patch });
      assert.equal(verdict.status, "mismatch");
    }
    assert.equal(paymentQuoteFailure("mismatch").error, MISMATCH_QUOTE_MESSAGE);
  });

  it("does not substitute a missing quote id", () => {
    const verdict = judgeStoredQuote({ ...base, found: false });
    assert.equal(verdict.status, "missing");
    assert.equal("option" in verdict, false);
    assert.equal(paymentQuoteFailure("missing").error, EXPIRED_QUOTE_MESSAGE);
  });

  it("rejects a fake rgv-local shipment", () => {
    const gate = freeRgvDelivery({
      postalCode: "78572",
      city: "Mission",
      state: "TX",
      rolls: 16,
    });
    assert.equal(gate.eligible, false);
    const charge = rgvLocalCharge(gate.eligible);
    assert.equal("error" in charge, true);
  });
});

describe("webhook settlement", () => {
  function io(overrides: Partial<{
    processed: boolean;
    mark: "updated" | "already_paid" | "failed";
    flag: "ok" | "failed";
  }> = {}) {
    const calls: string[] = [];
    let processed = overrides.processed ?? false;
    return {
      calls,
      adapter: {
        isEventProcessed: async () => processed,
        markPaidIfUnpaid: async () => {
          calls.push("mark");
          return overrides.mark ?? "updated";
        },
        flagReview: async () => {
          calls.push("flag");
          return overrides.flag ?? "ok";
        },
        recordEvent: async () => {
          calls.push("record");
          processed = true;
        },
        applyPaidEffects: async () => {
          calls.push("effects");
          return "done" as const;
        },
        sendConfirmation: async () => {
          calls.push("email");
          return "sent" as const;
        },
      },
    };
  }

  it("flags an amount mismatch and leaves the order unpaid", async () => {
    assert.equal(
      judgePaymentMatch({
        amountReceived: 100,
        currency: "usd",
        paymentIntentId: "pi_1",
        orderTotalCents: 2500,
        orderCurrency: "usd",
        orderPaymentIntentId: "pi_1",
      }),
      "mismatch"
    );
    const harness = io();
    const outcome = await runSettlement("mismatch", harness.adapter);
    assert.equal(outcome, "mismatch");
    assert.deepEqual(harness.calls, ["flag", "record"]);
    assert.deepEqual(paidSideEffects(false), []);
  });

  it("rejects a payment intent id that is not the one stored on the order", () => {
    assert.equal(
      judgePaymentMatch({
        amountReceived: 2500,
        currency: "usd",
        paymentIntentId: "pi_other",
        orderTotalCents: 2500,
        orderCurrency: "usd",
        orderPaymentIntentId: "pi_1",
      }),
      "mismatch"
    );
  });

  it("flags a stock shortage instead of decrementing below zero", () => {
    assert.equal(stockLineOutcome(3, 5), "short");
    assert.equal(stockLineOutcome(5, 5), "decrement");
    assert.equal(stockLineOutcome(null, 5), "untracked");
    assert.equal(stockShortageOrderStatus(), "paid");
  });

  it("settles an order createPaymentIntent flagged because the intent already succeeded", () => {
    const plan = planPaymentIntentSucceeded({
      order: {
        status: "payment_review",
        totalCents: 2500,
        currency: "usd",
        paymentIntentId: "pi_succeeded",
      },
      amountReceived: 2500,
      currency: "usd",
      paymentIntentId: "pi_succeeded",
    });
    assert.deepEqual(plan, { action: "settle", clearPaymentReview: true, status: "paid" });
  });

  it("settles an order the cron flagged while the PaymentIntent was processing", () => {
    const plan = planPaymentIntentSucceeded({
      order: {
        status: "payment_review",
        totalCents: 4800,
        currency: "usd",
        paymentIntentId: "pi_processing",
      },
      amountReceived: 4800,
      currency: "usd",
      paymentIntentId: "pi_processing",
    });
    assert.deepEqual(plan, { action: "settle", clearPaymentReview: true, status: "paid" });
  });

  it("inserts a review row when no order matches the PaymentIntent", () => {
    const plan = planPaymentIntentSucceeded({
      order: null,
      amountReceived: 2500,
      currency: "usd",
      paymentIntentId: "pi_unknown",
    });
    assert.deepEqual(plan, { action: "insert_unmatched", status: "payment_review" });
  });

  it("rejects the wrong currency", () => {
    assert.equal(
      judgePaymentMatch({
        amountReceived: 2500,
        currency: "eur",
        paymentIntentId: "pi_1",
        orderTotalCents: 2500,
        orderCurrency: "usd",
        orderPaymentIntentId: "pi_1",
      }),
      "mismatch"
    );
  });

  it("ignores a duplicate event on an already paid order", async () => {
    const harness = io({ processed: true, mark: "already_paid" });
    const outcome = await runSettlement("match", harness.adapter);
    assert.equal(outcome, "duplicate_event");
    assert.deepEqual(harness.calls, []);
  });

  it("does not apply stock or coupon a second time when they are already settled", async () => {
    let ledger = { inventorySettled: true, couponSettled: true };
    const applied: string[] = [];
    const outcome = await runSettlement("match", {
      isEventProcessed: async () => false,
      markPaidIfUnpaid: async () => "already_paid",
      flagReview: async () => "ok",
      recordEvent: async () => undefined,
      applyPaidEffects: async () => {
        const step = applyPaidEffectLedger(ledger, null);
        ledger = step.ledger;
        applied.push(...step.applied);
        return step.status;
      },
      sendConfirmation: async () => "already_sent",
    });
    assert.equal(outcome, "already_paid");
    assert.deepEqual(applied, []);
  });

  it("completes the order when a midway failure is retried", async () => {
    const first = io({ mark: "failed" });
    assert.equal(await runSettlement("match", first.adapter), "incomplete");
    assert.deepEqual(first.calls, ["mark"]);
    const second = io({ mark: "updated" });
    assert.equal(await runSettlement("match", second.adapter), "paid");
    assert.deepEqual(second.calls, ["mark", "effects", "email", "record"]);
    assert.deepEqual(paidSideEffects(true), ["stock", "coupon"]);
  });

  it("failure after the paid update, then retry, completes stock and coupon exactly once", async () => {
    let ledger = { inventorySettled: false, couponSettled: false };
    let paid = false;
    let failAfter: "inventory" | null = "inventory";
    let emails = 0;
    const applied = { stock: 0, coupon: 0 };
    const adapter = {
      isEventProcessed: async () => false,
      markPaidIfUnpaid: async () => {
        if (paid) return "already_paid" as const;
        paid = true;
        return "updated" as const;
      },
      flagReview: async () => "ok" as const,
      recordEvent: async () => undefined,
      applyPaidEffects: async () => {
        const step = applyPaidEffectLedger(ledger, failAfter);
        failAfter = null;
        ledger = step.ledger;
        for (const effect of step.applied) applied[effect] += 1;
        return step.status;
      },
      sendConfirmation: async () => {
        emails += 1;
        return "sent" as const;
      },
    };
    assert.equal(await runSettlement("match", adapter), "incomplete");
    assert.equal(emails, 0);
    assert.equal(await runSettlement("match", adapter), "already_paid");
    assert.equal(applied.stock, 1);
    assert.equal(applied.coupon, 1);
    assert.equal(emails, 1);
  });

  it("keeps a failed or canceled payment pending and flags a refund or dispute once", async () => {
    assert.deepEqual(stripeEventSideEffect("payment_intent.payment_failed"), {
      kind: "pending_notice",
      label: "payment_failed",
    });
    assert.deepEqual(stripeEventSideEffect("payment_intent.canceled"), {
      kind: "pending_notice",
      label: "canceled",
    });
    assert.equal(stripeEventSideEffect("charge.refunded").kind, "review");
    assert.equal(stripeEventSideEffect("charge.dispute.created").kind, "review");

    let applies = 0;
    let records = 0;
    const first = await runIdempotentSideEffect({
      alreadyProcessed: false,
      apply: async () => {
        applies += 1;
        return "ok";
      },
      record: async () => {
        records += 1;
      },
    });
    const second = await runIdempotentSideEffect({
      alreadyProcessed: true,
      apply: async () => {
        applies += 1;
        return "ok";
      },
      record: async () => {
        records += 1;
      },
    });
    const failed = await runIdempotentSideEffect({
      alreadyProcessed: false,
      apply: async () => "failed",
      record: async () => {
        records += 1;
      },
    });
    assert.equal(first, "done");
    assert.equal(second, "duplicate");
    assert.equal(failed, "failed");
    assert.equal(applies, 1);
    assert.equal(records, 1);
  });

  it("rejects an invalid webhook signature on the raw body", () => {
    const stripe = new Stripe("sk_test_51Payment");
    const payload = JSON.stringify({ id: "evt_test", object: "event" });
    const secret = "whsec_test_secret_value";
    assert.throws(() => verifyWebhookSignature(payload, "t=1,v1=deadbeef", secret));
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = verifyWebhookSignature(payload, header, secret);
    assert.equal(event.id, "evt_test");
  });
});

describe("pending orders", () => {
  it("does not count a pending order as a sale and drops abandoned ones", () => {
    assert.equal(countsAsSale("pending_payment", "pending"), false);
    assert.equal(countsAsSale("paid", "Paid & Cleared"), true);
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const fresh = new Date().toISOString();
    assert.equal(isAbandonedPending("pending_payment", old), true);
    assert.equal(isAbandonedPending("pending_payment", fresh), false);
    assert.equal(isAbandonedPending("paid", old), false);
    const createdAt = old;
    const recent = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    assert.equal(
      planAbandonedCleanup({ status: "pending_payment", createdAt: recent, intentStatus: "succeeded" }),
      "flag_review"
    );
    assert.equal(
      planAbandonedCleanup({
        status: "pending_payment",
        createdAt: recent,
        intentStatus: "requires_payment_method",
      }),
      "keep"
    );
    assert.equal(
      planAbandonedCleanup({ status: "pending_payment", createdAt, intentStatus: "processing" }),
      "flag_review"
    );
    assert.equal(
      planAbandonedCleanup({
        status: "pending_payment",
        createdAt,
        intentStatus: "requires_payment_method",
      }),
      "cancel_then_delete"
    );
    assert.equal(cronAuthorized(null, undefined), false);
    assert.equal(cronAuthorized("Bearer wrong", "secret"), false);
    assert.equal(cronAuthorized("Bearer secret", "secret"), true);
  });
});
