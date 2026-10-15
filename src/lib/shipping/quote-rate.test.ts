import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SHIPPING_QUOTE_BURST_LIMIT,
  SHIPPING_QUOTE_DAILY_LIMIT,
  hashClientIp,
  withQuoteRateLimit,
} from "./quote-rate";

describe("shipping quote rate limit", () => {
  it("allows a quote under the limit and calls the quote function", async () => {
    assert.equal(SHIPPING_QUOTE_BURST_LIMIT, 10);
    assert.equal(SHIPPING_QUOTE_DAILY_LIMIT, 60);
    let warpCalls = 0;
    const response = await withQuoteRateLimit("allowed", async () => {
      warpCalls += 1;
      return Response.json({ ok: true });
    });
    assert.equal(response.status, 200);
    assert.equal(warpCalls, 1);
  });

  it("returns 429 over the limit without calling WARP", async () => {
    let warpCalls = 0;
    const response = await withQuoteRateLimit("blocked", async () => {
      warpCalls += 1;
      return Response.json({ ok: true });
    });
    assert.equal(response.status, 429);
    assert.equal(warpCalls, 0);
    const body = (await response.json()) as { message?: string };
    assert.equal(body.message, "Too many shipping quotes. Try again later.");
    assert.notEqual(hashClientIp("203.0.113.5"), "203.0.113.5");
  });
});
