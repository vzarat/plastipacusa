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
      postalCode: "78516",
      city: "  ALAMO  ",
      state: "Texas",
      rolls: 64,
    });
    const abbreviated = freeRgvDelivery({
      postalCode: "78501",
      city: "mcallen",
      state: " tx ",
      rolls: 64,
    });
    assert.equal(spelled.eligible, true);
    assert.equal(abbreviated.eligible, true);
  });

  it("accepts only the seven active RGV cities", () => {
    for (const city of ["Alamo", "McAllen", "Mission", "Hidalgo", "Edinburg", "Mercedes", "Weslaco"]) {
      assert.equal(
        freeRgvDelivery({ postalCode: "78501", city, state: "TX", rolls: 64 }).eligible,
        true,
        city
      );
    }
  });

  it("does not treat Brownsville, Harlingen, or other Valley ZIPs as RGV delivery", () => {
    assert.equal(
      freeRgvDelivery({ postalCode: "78521", city: "Brownsville", state: "TX", rolls: 64 }).inValley,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "78550", city: "Harlingen", state: "TX", rolls: 64 }).eligible,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "78577", city: "Pharr", state: "TX", rolls: 64 }).inValley,
      false
    );
    assert.equal(
      freeRgvDelivery({ postalCode: "78572", city: "Penitas", state: "Texas", rolls: 64 }).eligible,
      false
    );
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
    assert.equal(banner.options[0]?.label, RGV_FREE_DELIVERY_LABEL);
  });

  it("offers free Friday delivery for Houston city and 770-772, not 773", () => {
    const houston = evalShippingEligibility("77002", "Houston", "TX", 64, 256);
    const prefix = evalShippingEligibility("77201", "Houston", "TX", 64, 256);
    const outside = evalShippingEligibility("77301", "Spring", "TX", 64, 256);
    assert.equal(houston.options[0]?.id, "houston-friday");
    assert.equal(houston.options[0]?.label, HOUSTON_FRIDAY_LABEL);
    assert.equal(houston.options[0]?.scheduleNote, HOUSTON_FRIDAY_NOTE);
    assert.equal(prefix.options[0]?.id, "houston-friday");
    assert.equal(outside.region, "out-of-region");
  });
});
