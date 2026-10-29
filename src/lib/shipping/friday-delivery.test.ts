import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessDaysUntilDelivery,
  formatFridayDeliveryDate,
  fridayDeliverySlots,
  fridayDeliveryTitle,
  fridayFreeDeliveryRegion,
  fridayRegionFromOptionId,
  fridayRegionTag,
  fridayTransitLabel,
  nextFridayDeliveryIso,
  resolveFridayDeliveryIso,
} from "./friday-delivery";

describe("Friday free delivery", () => {
  it("names Houston and RGV delivery separately", () => {
    assert.equal(
      fridayDeliveryTitle("houston"),
      "Houston Friday Free Delivery (Scheduled)"
    );
    assert.equal(fridayDeliveryTitle("rgv"), "RGV Friday Free Delivery (Scheduled)");
    assert.equal(fridayRegionTag("houston"), "Houston");
    assert.equal(fridayRegionTag("rgv"), "RGV");
    assert.equal(fridayRegionFromOptionId("houston-friday"), "houston");
    assert.equal(fridayRegionFromOptionId("rgv-local"), "rgv");
  });

  it("detects Houston and the Rio Grande Valley", () => {
    assert.equal(
      fridayFreeDeliveryRegion({ city: "Houston", state: "TX", postalCode: "77002" }),
      "houston"
    );
    assert.equal(
      fridayFreeDeliveryRegion({ city: "Mission", state: "Texas", postalCode: "78572" }),
      "rgv"
    );
    assert.equal(
      fridayFreeDeliveryRegion({ city: "Dallas", state: "TX", postalCode: "75207" }),
      null
    );
  });

  it("offers this Friday from Monday through Tuesday", () => {
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-26T20:00:00Z")), "2026-10-30");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-27T15:00:00Z")), "2026-10-30");
  });

  it("skips this Friday when fewer than 3 business days remain to prepare the order", () => {
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-28T20:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-29T04:59:00Z")), "2026-11-06");
  });

  it("skips this Friday from Thursday through Sunday", () => {
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-29T05:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-29T15:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-30T14:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-31T17:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-11-01T18:00:00Z")), "2026-11-06");
    assert.equal(formatFridayDeliveryDate("2026-11-06"), "Friday, November 6, 2026");
  });

  it("offers the next two Fridays and counts business days until the selected one", () => {
    const monday = new Date("2026-10-26T20:00:00Z");
    assert.deepEqual(fridayDeliverySlots(monday), ["2026-10-30", "2026-11-06"]);
    assert.equal(businessDaysUntilDelivery("2026-10-30", monday), 4);
    assert.equal(businessDaysUntilDelivery("2026-11-06", monday), 9);
    assert.equal(fridayTransitLabel("2026-10-30", monday), "4 business days until delivery");

    const thursday = new Date("2026-10-29T15:00:00Z");
    assert.deepEqual(fridayDeliverySlots(thursday), ["2026-11-06", "2026-11-13"]);
    assert.equal(businessDaysUntilDelivery("2026-11-06", thursday), 6);
    assert.equal(resolveFridayDeliveryIso("2026-10-30", thursday), "2026-11-06");
    assert.equal(resolveFridayDeliveryIso("2026-11-13", thursday), "2026-11-13");
    assert.equal(resolveFridayDeliveryIso("2026-12-25", thursday), "2026-11-06");
  });
});
