import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { freeRgvDelivery } from "./rgv-delivery";
import { shipmentFreightFromCatalog } from "./shipment";

describe("catalog shipment freight", () => {
  it("ignores a fake totalRolls and does not qualify for rgv-local", () => {
    const freight = shipmentFreightFromCatalog(
      [
        {
          sku: "M-20",
          productSlug: "machine-film",
          quantity: 16,
          totalBoxes: 64,
          totalRolls: 640,
          application: "hand",
        },
      ],
      [
        {
          sku: "M-20",
          rolls_count: 1,
          boxes_count: 1,
          roll_weight_lbs: 30.6,
          box_weight_lbs: null,
          pallet_weight_lbs: null,
          products: {
            slug: "machine-film",
            application: "machine",
            roll_weight_lbs: 30.6,
            pallet_weight_lbs: null,
            pallet_dimensions: null,
            rolls_per_box: 1,
            width_inches: 20,
            gauge: 51,
            length_feet: 7000,
          },
        },
      ],
      new Map()
    );

    assert.equal(freight.rolls, 16);
    assert.equal(freight.weightLbs, 489.6);
    assert.equal(
      freeRgvDelivery({
        postalCode: "78572",
        city: "Mission",
        state: "TX",
        rolls: freight.rolls,
      }).eligible,
      false
    );
  });
});
