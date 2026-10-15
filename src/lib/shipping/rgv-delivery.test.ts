import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freeRgvDelivery } from "./rgv-delivery";
import { evalShippingEligibility } from "../shippingRules";

describe("free RGV delivery", () => {
  it("does not treat 16 machine-film boxes under 64 rolls as free", () => {
    const rolls = 16;
    const quote = freeRgvDelivery({
      postalCode: "78572",
      city: "Mission",
      state: "TX",
      rolls,
    });
    const banner = evalShippingEligibility("78572", "Mission", "TX", 16, rolls);
    assert.equal(quote.inValley, true);
    assert.equal(quote.eligible, false);
    assert.equal(banner.freeDeliveryEligible, false);
  });

  it("rejects 78500 and a 785 ZIP outside Texas", () => {
    assert.equal(
      freeRgvDelivery({ postalCode: "78500", city: "Austin", state: "TX", rolls: 64 }).inValley,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "78572", city: "Mission", state: "CA", rolls: 64 }).eligible,
      false
    );
    assert.equal(
      evalShippingEligibility("78500", "Austin", "TX", 16, 64).freeDeliveryEligible,
      false
    );
    assert.equal(
      evalShippingEligibility("78572", "Mission", "CA", 16, 64).region,
      "out-of-region"
    );
  });

  it("normalizes Texas and city spelling", () => {
    const spelled = freeRgvDelivery({
      postalCode: "00000",
      city: "  PEÑITAS  ",
      state: "Texas",
      rolls: 64,
    });
    const abbreviated = freeRgvDelivery({
      postalCode: "78572",
      city: "mcallen",
      state: " tx ",
      rolls: 64,
    });
    assert.equal(spelled.eligible, true);
    assert.equal(abbreviated.eligible, true);
  });

  it("includes a Texas 78572 shipment of 64 rolls", () => {
    const quote = freeRgvDelivery({
      postalCode: "78572",
      city: "Mission",
      state: "TX",
      rolls: 64,
    });
    const banner = evalShippingEligibility("78572", "Mission", "TX", 16, 64);
    assert.equal(quote.eligible, true);
    assert.equal(banner.freeDeliveryEligible, true);
  });
});
