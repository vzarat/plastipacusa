import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFridayDeliveryDate,
  fridayFreeDeliveryRegion,
  nextFridayDeliveryIso,
} from "./friday-delivery";

describe("Friday free delivery", () => {
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

  it("offers this Friday from Monday through Wednesday", () => {
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-26T20:00:00Z")), "2026-10-30");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-27T15:00:00Z")), "2026-10-30");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-28T20:00:00Z")), "2026-10-30");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-29T04:59:00Z")), "2026-10-30");
  });

  it("skips this Friday from Thursday through Sunday", () => {
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-29T05:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-29T15:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-30T14:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-10-31T17:00:00Z")), "2026-11-06");
    assert.equal(nextFridayDeliveryIso(new Date("2026-11-01T18:00:00Z")), "2026-11-06");
    assert.equal(formatFridayDeliveryDate("2026-11-06"), "Friday, November 6, 2026");
  });
});
