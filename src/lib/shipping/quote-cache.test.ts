import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ShipmentFreight, ShippingOption } from "./types";
import {
  freightCacheKey,
  getCachedWarpOptions,
  judgeStoredQuote,
  keepPayableOptions,
  missingQuoteColumn,
  shouldDeleteStoredQuote,
} from "./quote-cache";

const NOW = Date.parse("2026-10-15T17:24:00.000Z");

function option(id: string, expiresAt: string): ShippingOption {
  return {
    id,
    provider: "warp",
    mode: "truckload",
    serviceName: id,
    description: "Dedicated full truckload.",
    price: 10,
    transitDays: 1,
    expiresAt,
    destinationZip: "77002",
  };
}

const freight: ShipmentFreight = {
  weightLbs: 100,
  palletCount: 1,
  lengthIn: 48,
  widthIn: 48,
  heightIn: 48,
  rolls: 0,
  boxes: 0,
  pieces: [
    {
      lengthIn: 48,
      widthIn: 48,
      heightIn: 48,
      weightLbs: 100,
      quantity: 1,
      packaging: "pallet",
      dimensionLabel: "48 x 48 x 48 in",
      weightLabel: "100 lbs",
    },
  ],
};

const base = {
  found: true,
  expiresAt: "2026-10-16T17:24:00.000Z",
  destinationZip: "77002",
  weightLbs: 1173.4,
  palletCount: 1,
  itemsHash: "hash-a",
  zip: "77002",
  freightWeightLbs: 1173.2,
  freightPalletCount: 1,
  freightItemsHash: "hash-a",
  now: NOW,
};

describe("stored shipping quotes", () => {
  it("rejects an expired quote and only deletes expired rows", () => {
    const verdict = judgeStoredQuote({
      ...base,
      expiresAt: new Date(NOW + 4 * 60 * 1000).toISOString(),
    });
    assert.equal(verdict.status, "expired");
    assert.equal(shouldDeleteStoredQuote("expired"), true);
    assert.equal(shouldDeleteStoredQuote("mismatch"), false);
    assert.equal(shouldDeleteStoredQuote("missing"), false);
  });

  it("rejects a changed cart without treating it as a delete", () => {
    assert.equal(judgeStoredQuote({ ...base, zip: "60601" }).status, "mismatch");
    assert.equal(judgeStoredQuote({ ...base, freightWeightLbs: 1200 }).status, "mismatch");
    assert.equal(judgeStoredQuote({ ...base, freightPalletCount: 2 }).status, "mismatch");
    assert.equal(judgeStoredQuote({ ...base, freightItemsHash: "hash-b" }).status, "mismatch");
    assert.equal(judgeStoredQuote(base).status, "ok");
  });

  it("recognizes a missing carrier_price_cents column without treating other errors as columns", () => {
    assert.equal(
      missingQuoteColumn(
        "Could not find the 'carrier_price_cents' column of 'shipping_quotes' in the schema cache"
      ),
      "carrier_price_cents"
    );
    assert.equal(missingQuoteColumn("duplicate key value violates unique constraint"), null);
  });

  it("rejects a missing quote id with no substitute", () => {
    assert.equal(judgeStoredQuote({ ...base, found: false }).status, "missing");
  });

  it("drops one short-lived option and keeps the others", () => {
    const kept = keepPayableOptions(
      [
        option("short", new Date(NOW + 2 * 60 * 1000).toISOString()),
        option("truck", new Date(NOW + 2 * 24 * 60 * 60 * 1000).toISOString()),
        option("ltl", new Date(NOW + 10 * 60 * 1000).toISOString()),
      ],
      NOW
    );
    assert.deepEqual(
      kept.map((item) => item.id),
      ["truck", "ltl"]
    );
  });

  it("keeps market and freight quotes in separate cache keys", () => {
    assert.notEqual(
      freightCacheKey("77002", freight, "market"),
      freightCacheKey("77002", freight, "freights")
    );
  });

  it("returns no options when storing the quote fails", async () => {
    const previousFetch = globalThis.fetch;
    const previousRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const previousEnv = process.env.WARP_ENV;
    const previousKey = process.env.WARP_API_KEY_STAGING;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.WARP_ENV = "staging";
    process.env.WARP_API_KEY_STAGING = "test-only";
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          quote_id: "unstored-quote",
          price: { amount: 100 },
          transit_time: 2,
          expiration_time_utc: Math.floor(Date.now() / 1000) + 3600,
          status: "ACCEPT",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }) as typeof fetch;

    try {
      const first = await getCachedWarpOptions("99801", freight);
      const callsAfterFirst = calls;
      const second = await getCachedWarpOptions("99801", freight);
      assert.deepEqual(first, []);
      assert.deepEqual(second, []);
      assert.ok(callsAfterFirst > 0);
      assert.ok(calls > callsAfterFirst);
    } finally {
      globalThis.fetch = previousFetch;
      if (previousRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previousRole;
      if (previousEnv === undefined) delete process.env.WARP_ENV;
      else process.env.WARP_ENV = previousEnv;
      if (previousKey === undefined) delete process.env.WARP_API_KEY_STAGING;
      else process.env.WARP_API_KEY_STAGING = previousKey;
    }
  });
});
