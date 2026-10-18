import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  exceedsLtlLimits,
  featuredCarrierOptions,
  marketSpreadNeedsRetry,
  hideTruckloadForSmallShipment,
  marketItemsFromPieces,
  marketOptionsBody,
  normalizeCarrier,
  selectMarketOptions,
} from "./market-options";
import { ShipmentDataError } from "./shipment";
import type { FreightPiece } from "./types";

const NOW = Date.parse("2026-10-15T17:24:00.000Z");

const SAMPLE = {
  market_options: [
    { carrier_name: "Southwestern Motor Transport", service_level: "STANDARD", price_usd: 221.88, transit_days: 1, bookable: false, quote_id: "", expires_at: "2026-10-15T00:00:00.000Z" },
    { carrier_name: "Forward", service_level: "STANDARD", price_usd: 222.852, transit_days: 1, bookable: true, quote_id: "q-forward", expires_at: "2026-10-18T00:00:00.000Z" },
    { carrier_name: "Forward Air", service_level: "STANDARD", price_usd: 237.612, transit_days: 1, bookable: true, quote_id: "q-forward-air", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "Vocar Transportation", service_level: "STANDARD", price_usd: 272.976, transit_days: 2, bookable: true, quote_id: "q-vocar", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "FedEx Economy", service_level: "FEDEX_FREIGHT_ECONOMY", price_usd: 273.81600000000003, transit_days: 2, bookable: true, quote_id: "q-fedex-econ", expires_at: "2026-10-18T17:23:23.075Z" },
    { carrier_name: "FedEx Priority", service_level: "FEDEX_FREIGHT_PRIORITY", price_usd: 273.96000000000004, transit_days: 1, bookable: true, quote_id: "q-fedex-pri", expires_at: "2026-10-18T17:23:23.075Z" },
    { carrier_name: "FEDEX FREIGHT ECONOMY", service_level: "STANDARD", price_usd: 296.244, transit_days: 2, bookable: true, quote_id: "q-fedex-econ-2", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "RL Carriers", service_level: "STANDARD", price_usd: 297.072, transit_days: 1, bookable: true, quote_id: "q-rl", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "FEDEX FREIGHT PRIORITY", service_level: "STANDARD", price_usd: 310.548, transit_days: 1, bookable: true, quote_id: "q-fedex-pri-2", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "CCFS", service_level: "STANDARD", price_usd: 316.17600000000004, transit_days: 6, bookable: true, quote_id: "q-ccfs", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "AVERITT EXPRESS INC", service_level: "STANDARD", price_usd: 338.12399999999997, transit_days: 1, bookable: true, quote_id: "q-averitt", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "RL Carriers", service_level: "GUARANTEED", price_usd: 339.072, transit_days: 1, bookable: true, quote_id: "q-rl-g", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "Saia LTL Freight", service_level: "STANDARD", price_usd: 341.11199999999997, transit_days: 1, bookable: true, quote_id: "q-saia", expires_at: "2026-10-18T17:23:23.075Z" },
    { carrier_name: "Averitt Express", service_level: "STND", price_usd: 363.72, transit_days: 1, bookable: true, quote_id: "q-averitt-2", expires_at: "2026-10-18T17:23:23.075Z" },
    { carrier_name: "XPO", service_level: "STANDARD", price_usd: 365.016, transit_days: 1, bookable: true, quote_id: "q-xpo", expires_at: "2026-10-16T17:23:21.000Z" },
    { carrier_name: "XPO Logistics", service_level: "STANDARD", price_usd: 376.17600000000004, transit_days: 1, bookable: true, quote_id: "q-xpo-2", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "SOUTHWESTERN MOTOR TRANSPORT INC", service_level: "GUARANTEED", price_usd: 409.62, transit_days: 1, bookable: true, quote_id: "q-smt-g", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "AVERITT EXPRESS INC", service_level: "GUARANTEED", price_usd: 430.524, transit_days: 1, bookable: true, quote_id: "q-averitt-g", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "ESTES", service_level: "STANDARD", price_usd: 430.74, transit_days: 1, bookable: true, quote_id: "q-estes", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "XPO Logistics", service_level: "GUARANTEED", price_usd: 451.776, transit_days: 1, bookable: true, quote_id: "q-xpo-g", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "ABF Freight", service_level: "MR", price_usd: 478.8, transit_days: 2, bookable: true, quote_id: "q-abf-mr", expires_at: "2026-10-18T17:23:23.075Z" },
    { carrier_name: "SAIA MOTOR FREIGHT LINE LLC", service_level: "GUARANTEED", price_usd: 494.12399999999997, transit_days: 1, bookable: true, quote_id: "q-saia-g", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "ESTES", service_level: "GUARANTEED", price_usd: 494.556, transit_days: 1, bookable: true, quote_id: "q-estes-g", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "ABF FREIGHT SYSTEM INC", service_level: "STANDARD", price_usd: 581.0519999999999, transit_days: 2, bookable: true, quote_id: "q-abf", expires_at: "2026-10-17T23:59:59.999Z" },
    { carrier_name: "Old Dominion Freight Line", service_level: "STANDARD", price_usd: 675.444, transit_days: 1, bookable: true, quote_id: "q-odfl", expires_at: "2026-10-18T17:23:23.075Z" },
    { carrier_name: "UNIS Transportation", service_level: "STANDARD", price_usd: 705.6, transit_days: 1, bookable: true, quote_id: "q-unis", expires_at: "2026-10-18T17:23:23.075Z" },
  ],
};

function piece(overrides: Partial<FreightPiece> = {}): FreightPiece {
  return {
    lengthIn: 48,
    widthIn: 48,
    heightIn: 48,
    weightLbs: 100,
    quantity: 1,
    packaging: "pallet",
    dimensionLabel: "48 x 48 x 48 in",
    weightLabel: "100 lbs",
    ...overrides,
  };
}

describe("market option carriers", () => {
  it("maps the script's carrier variants onto one label", () => {
    assert.equal(normalizeCarrier("XPO").label, normalizeCarrier("XPO Logistics").label);
    assert.equal(normalizeCarrier("FedEx Economy").label, normalizeCarrier("FEDEX FREIGHT ECONOMY").label);
    assert.equal(normalizeCarrier("Averitt Express").label, normalizeCarrier("AVERITT EXPRESS INC").label);
    assert.equal(normalizeCarrier("ABF Freight").label, normalizeCarrier("ABF FREIGHT SYSTEM INC").label);
    assert.equal(normalizeCarrier("Saia LTL Freight").label, normalizeCarrier("SAIA MOTOR FREIGHT LINE LLC").label);
    assert.equal(normalizeCarrier("ESTES").label, "Estes");
    assert.equal(normalizeCarrier("RL Carriers").label, "RL Carriers");
  });

  it("keeps the cheapest bookable quote for each carrier and service", () => {
    const selected = selectMarketOptions(SAMPLE, NOW);
    assert.equal(selected.some((option) => option.quoteId === ""), false);
    assert.equal(selected.filter((option) => option.carrierKey === "xpo" && option.serviceLevel === "STANDARD").length, 1);
    assert.equal(selected[0]?.carrierName, "Forward");
    assert.ok(selected.every((option, index) => index === 0 || option.price >= selected[index - 1].price));
    const featured = featuredCarrierOptions(selected.map((option) => ({ ...option, id: option.quoteId, transitDays: option.transitDays || 1 })));
    assert.equal(featured.shown.length, 5);
    assert.equal(featured.shown.some((option) => option.id === selected[0]?.quoteId), true);
    assert.equal(featured.shown.some((option) => option.serviceLevel === "GUARANTEED"), true);
    const fastest = [...selected].sort((a, b) => (a.transitDays || 99) - (b.transitDays || 99))[0];
    assert.equal(featured.shown.some((option) => option.id === fastest?.quoteId), true);
    const mixed = hideTruckloadForSmallShipment(
      [
        { mode: "LTL", serviceLevel: "STANDARD", isWarp: false },
        { mode: "truckload", serviceLevel: "WARP FTL", isWarp: true },
      ],
      1
    );
    assert.equal(mixed.length, 1);
    assert.equal(mixed[0]?.mode, "LTL");
    const unnamed = selectMarketOptions(
      {
        market_options: [
          {
            carrier_name: "",
            service_level: "STANDARD",
            price_usd: 100,
            transit_days: 3,
            bookable: true,
            quote_id: "q-service",
            expires_at: "2026-10-18T00:00:00.000Z",
          },
        ],
      },
      NOW
    );
    assert.equal(unnamed[0]?.carrierName, "");
    assert.equal(unnamed[0]?.serviceLevel, "STANDARD");
  });

  it("rounds one piece up into a scalar body and refuses a zero weight", () => {
    const items = marketItemsFromPieces([piece({ weightLbs: 100.1, lengthIn: 48.1, heightIn: 19.5 })]);
    assert.equal(items[0]?.weightLbsPerPallet, 101);
    assert.equal(items[0]?.lengthIn, 48.1);
    assert.equal(items[0]?.heightIn, 19.5);
    const body = marketOptionsBody({
      originZip: "78572",
      destinationZip: "77002",
      pickupDate: "2026-10-16",
      items,
    });
    assert.equal("items" in body, false);
    assert.equal(body.weight_lbs_per_pallet, 101);
    assert.throws(
      () => marketItemsFromPieces([piece({ weightLbs: 0 })]),
      (error: unknown) => error instanceof ShipmentDataError
    );
  });

  it("retries only a cached spread that has no bookable quote id", () => {
    assert.equal(marketSpreadNeedsRetry({ retryable: true, bookableQuotes: 0 }), true);
    assert.equal(marketSpreadNeedsRetry({ retryable: true, bookableQuotes: 2 }), false);
    assert.equal(marketSpreadNeedsRetry({ retryable: false, bookableQuotes: 0 }), false);
  });

  it("reads EXCEEDS_LTL_LIMITS from the JSON code", () => {
    assert.equal(exceedsLtlLimits(JSON.stringify({ code: "EXCEEDS_LTL_LIMITS" })), true);
    assert.equal(exceedsLtlLimits("carrier said EXCEEDS_LTL_LIMITS"), true);
    assert.equal(exceedsLtlLimits(JSON.stringify({ code: "MISSING_DIMS" })), false);
  });
});
