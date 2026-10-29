import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  carrierTimingLabel,
  estimatedShipmentWindow,
  nextBusinessPickupDate,
  scheduleFromTransitDays,
} from "./dates";

describe("order preparation window", () => {
  const thursday = new Date(2026, 9, 29, 12);

  it("asks carriers to pick up after 3 business days of preparation", () => {
    assert.equal(nextBusinessPickupDate(thursday), "2026-11-03");
  });

  it("adds preparation to carrier transit for the customer window", () => {
    const schedule = scheduleFromTransitDays(1, thursday);
    assert.equal(
      schedule.deliveryLabel,
      "2–3 business days to prepare, then 1 business day in transit"
    );
    assert.equal(schedule.shippingDate, "Mon, Nov 2 – Tue, Nov 3");
    assert.equal(schedule.deliveryRange, "Tue, Nov 3 – Wed, Nov 4");
    assert.equal(carrierTimingLabel(3), "2–3 business days to prepare, then 3 business days in transit");
  });

  it("states the checkout delivery from a pickup 3 business days after purchase", () => {
    const estimate = estimatedShipmentWindow(1, thursday);
    assert.equal(estimate.readyLabel, "Tue, Nov 3");
    assert.equal(estimate.deliveryLabel, "Wed, Nov 4");
    assert.equal(estimate.summary, "Estimated delivery: Wed, Nov 4");
    assert.equal(
      estimate.detail,
      "Ready for pickup Tue, Nov 3, 3 business days after purchase, then 1 business day in transit."
    );
    assert.equal(estimatedShipmentWindow(2, thursday).deliveryLabel, "Thu, Nov 5");
  });
});
