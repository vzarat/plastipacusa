import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freeRgvDelivery } from "./rgv-delivery";
import {
  evalShippingEligibility,
  HOUSTON_FRIDAY_LABEL,
  HOUSTON_FRIDAY_NOTE,
  RGV_FREE_DELIVERY_LABEL,
} from "../shippingRules";

describe("free RGV delivery", () => {
  it("does not unlock free local below 2 full-pallet equivalents", () => {
    const rolls = 40; // 1 Automatic full pallet
    const quote = freeRgvDelivery({
      postalCode: "78572",
      city: "Mission",
      state: "TX",
      rolls,
    });
    const banner = evalShippingEligibility("78572", "Mission", "TX", 0, rolls);
    assert.equal(quote.inValley, true);
    assert.equal(quote.eligible, false);
    assert.equal(banner.freeDeliveryEligible, false);
  });

  it("rejects city-only claims, non-Texas, and non-785 ZIPs", () => {
    assert.equal(
      freeRgvDelivery({ postalCode: "78500", city: "Austin", state: "TX", rolls: 80 }).inValley,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "78572", city: "Mission", state: "CA", rolls: 80 }).eligible,
      false
    );
    assert.equal(
      freeRgvDelivery({
        postalCode: "10001",
        city: "McAllen",
        state: "TX",
        rolls: 80,
      }).inValley,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "", city: "McAllen", state: "TX", rolls: 80 }).inValley,
      false
    );
    assert.equal(
      evalShippingEligibility("78572", "Mission", "CA", 96, 384).region,
      "out-of-region"
    );
  });

  it("normalizes Texas and city spelling with a Valley ZIP", () => {
    const spelled = freeRgvDelivery({
      postalCode: "78516",
      city: "  ALAMO  ",
      state: "Texas",
      rolls: 80,
    });
    const abbreviated = freeRgvDelivery({
      postalCode: "78501",
      city: "mcallen",
      state: " tx ",
      rolls: 80,
    });
    assert.equal(spelled.eligible, true);
    assert.equal(abbreviated.eligible, true);
  });

  it("accepts only the seven active RGV cities", () => {
    for (const city of ["Alamo", "McAllen", "Mission", "Hidalgo", "Edinburg", "Mercedes", "Weslaco"]) {
      assert.equal(
        freeRgvDelivery({ postalCode: "78501", city, state: "TX", rolls: 80 }).eligible,
        true,
        city
      );
    }
  });

  it("does not treat Brownsville, Harlingen, or other Valley ZIPs as RGV delivery", () => {
    assert.equal(
      freeRgvDelivery({ postalCode: "78521", city: "Brownsville", state: "TX", rolls: 80 }).inValley,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "78550", city: "Harlingen", state: "TX", rolls: 80 }).eligible,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "78577", city: "Pharr", state: "TX", rolls: 80 }).inValley,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "78572", city: "Penitas", state: "Texas", rolls: 80 }).eligible,
      false
    );
  });

  it("includes a Texas 78572 shipment of 2 Automatic full pallets", () => {
    const quote = freeRgvDelivery({
      postalCode: "78572",
      city: "Mission",
      state: "TX",
      rolls: 80,
    });
    const banner = evalShippingEligibility("78572", "Mission", "TX", 0, 80);
    assert.equal(quote.eligible, true);
    assert.equal(banner.freeDeliveryEligible, true);
    assert.equal(banner.options[0]?.label, RGV_FREE_DELIVERY_LABEL);
  });

  it("offers free Friday delivery for Houston 770-772 ZIPs at 2+ pallets, not city-only", () => {
    const houston = evalShippingEligibility("77002", "Houston", "TX", 96, 384);
    const prefix = evalShippingEligibility("77201", "Pasadena", "TX", 96, 384);
    const cityOnly = evalShippingEligibility("", "Houston", "TX", 96, 384);
    const outside = evalShippingEligibility("77301", "Spring", "TX", 96, 384);
    assert.equal(houston.options[0]?.id, "houston-friday");
    assert.equal(houston.options[0]?.label, HOUSTON_FRIDAY_LABEL);
    assert.equal(houston.options[0]?.scheduleNote, HOUSTON_FRIDAY_NOTE);
    assert.equal(prefix.options[0]?.id, "houston-friday");
    assert.equal(cityOnly.region, "out-of-region");
    assert.equal(outside.region, "out-of-region");
  });
});
