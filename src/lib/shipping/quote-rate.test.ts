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
    const body = (await response.json()) as {
      message?: string;
      requestId?: string;
      error?: { code?: string; requestId?: string };
    };
    assert.equal(body.message, "Too many shipping quotes. Try again later.");
    assert.equal(body.error?.code, "INVALID_INPUT");
    assert.equal(typeof body.requestId, "string");
    assert.equal(body.error?.requestId, body.requestId);
    assert.notEqual(hashClientIp("203.0.113.5"), "203.0.113.5");
  });

  it("still quotes when the limiter cannot run", async () => {
    let warpCalls = 0;
    const response = await withQuoteRateLimit("unavailable", async () => {
      warpCalls += 1;
      return Response.json({ ok: true });
    }, "consume_shipping_quote_limit failed");
    assert.equal(response.status, 200);
    assert.equal(warpCalls, 1);
  });
});
