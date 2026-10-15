import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTO_REQUOTE_CAP,
  PAYABLE_BUFFER_MS,
  REQUOTE_REMAINING_MS,
  blocksCardStep,
  decideRequote,
  isQuotePayable,
  shouldAutoRequote,
  type RequoteOption,
} from "./quote-window";

const NOW = Date.parse("2026-10-15T17:24:00.000Z");

function at(ms: number): string {
  return new Date(NOW + ms).toISOString();
}

function option(overrides: Partial<RequoteOption> = {}): RequoteOption {
  return {
    id: "quote-old",
    price: 222.85,
    carrierKey: "forward",
    serviceLevel: "STANDARD",
    transitDays: 2,
    ...overrides,
  };
}

describe("shipping quote window", () => {
  it("re-quotes while more than 5 minutes remain and 7 minutes or less remain", () => {
    const expiresAt = at(REQUOTE_REMAINING_MS);
    assert.equal(
      shouldAutoRequote({ expiresAt, now: NOW, autoRequotes: 0, stepVisible: true }),
      true
    );
    assert.equal(blocksCardStep(expiresAt, NOW), false);
    assert.equal(isQuotePayable(expiresAt, NOW), true);
  });

  it("waits while more than 7 minutes remain", () => {
    const expiresAt = at(REQUOTE_REMAINING_MS + 1000);
    assert.equal(
      shouldAutoRequote({ expiresAt, now: NOW, autoRequotes: 0, stepVisible: true }),
      false
    );
    assert.equal(blocksCardStep(expiresAt, NOW), false);
  });

  it("blocks the card step at 5 minutes or less and does not re-quote", () => {
    const expiresAt = at(PAYABLE_BUFFER_MS);
    assert.equal(isQuotePayable(expiresAt, NOW), false);
    assert.equal(blocksCardStep(expiresAt, NOW), true);
    assert.equal(
      shouldAutoRequote({ expiresAt, now: NOW, autoRequotes: 0, stepVisible: true }),
      false
    );
  });

  it("leaves an undated option unblocked and skips automatic re-quote", () => {
    assert.equal(blocksCardStep(null, NOW), false);
    assert.equal(
      shouldAutoRequote({ expiresAt: null, now: NOW, autoRequotes: 0, stepVisible: true }),
      false
    );
  });

  it("does not auto re-quote while the shipping step is hidden", () => {
    const expiresAt = at(6 * 60 * 1000);
    assert.equal(
      shouldAutoRequote({ expiresAt, now: NOW, autoRequotes: 0, stepVisible: false }),
      false
    );
    assert.equal(
      shouldAutoRequote({ expiresAt, now: NOW, autoRequotes: 0, stepVisible: true }),
      true
    );
  });

  it("stops automatic re-quotes when the step is hidden or the cap is reached", () => {
    const expiresAt = at(6 * 60 * 1000);
    assert.equal(
      shouldAutoRequote({ expiresAt, now: NOW, autoRequotes: 0, stepVisible: false }),
      false
    );
    assert.equal(
      shouldAutoRequote({
        expiresAt,
        now: NOW,
        autoRequotes: AUTO_REQUOTE_CAP,
        stepVisible: true,
      }),
      false
    );
  });
});

describe("re-quote decision", () => {
  const selected = option();
  const base = {
    requestId: 4,
    responseRequestId: 4,
    autoRequotes: 0,
    failed: false,
    selected,
    options: [option({ id: "quote-new", price: 230 })],
  };

  it("replaces the quote id and reports a price change", () => {
    const decision = decideRequote(base);
    assert.deepEqual(decision, { type: "replace", quoteId: "quote-new", priceUpdated: true });
  });

  it("replaces the quote id when the price is the same", () => {
    const decision = decideRequote({
      ...base,
      options: [option({ id: "quote-new", price: 222.85 })],
    });
    assert.deepEqual(decision, { type: "replace", quoteId: "quote-new", priceUpdated: false });
  });

  it("clears the selection when the option is gone", () => {
    const decision = decideRequote({
      ...base,
      options: [option({ id: "other", carrierKey: "saia", serviceLevel: "STANDARD" })],
    });
    assert.deepEqual(decision, { type: "clear" });
  });

  it("clears the selection when several matches do not share one transit time", () => {
    const decision = decideRequote({
      ...base,
      options: [
        option({ id: "a", transitDays: 3 }),
        option({ id: "b", transitDays: 4 }),
      ],
    });
    assert.deepEqual(decision, { type: "clear" });
  });

  it("bypasses the cap when the refresh is manual", () => {
    const decision = decideRequote({
      ...base,
      autoRequotes: AUTO_REQUOTE_CAP,
      manual: true,
      options: [option({ id: "quote-new", price: 222.85 })],
    });
    assert.deepEqual(decision, { type: "replace", quoteId: "quote-new", priceUpdated: false });
  });

  it("does not replace the quote when the automatic cap is reached", () => {
    const decision = decideRequote({ ...base, autoRequotes: AUTO_REQUOTE_CAP });
    assert.deepEqual(decision, { type: "cap" });
  });

  it("ignores a stale response", () => {
    const decision = decideRequote({ ...base, responseRequestId: 3 });
    assert.deepEqual(decision, { type: "stale" });
  });

  it("keeps the selection when the re-quote fails", () => {
    const decision = decideRequote({ ...base, failed: true, options: [] });
    assert.deepEqual(decision, { type: "keep" });
  });
});
