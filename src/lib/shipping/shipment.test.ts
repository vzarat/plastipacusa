import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { marketItemsFromPieces } from "./market-options";
import { freeRgvDelivery } from "./rgv-delivery";
import { shipmentFreightFromCatalog } from "./shipment";

const HAND_80 = {
  sku: "HAND-80-64",
  rolls_count: 256,
  boxes_count: 64,
  roll_weight_lbs: 8.66,
  box_weight_lbs: 34.65,
  pallet_weight_lbs: 2240.2,
  products: {
    slug: "stretch-film-18-x-80-ga-x-1000ft",
    application: "hand",
    roll_weight_lbs: 8.66,
    pallet_weight_lbs: 2240.2,
    pallet_dimensions: "48 x 48 x 78",
    pallet_length_in: 48,
    pallet_width_in: 48,
    pallet_height_in: 78,
    half_pallet_length_in: 48,
    half_pallet_width_in: 48,
    half_pallet_height_in: 39,
    layer_length_in: 48,
    layer_width_in: 48,
    layer_height_in: 19.5,
    box_length_in: 12,
    box_width_in: 12,
    box_height_in: 19.5,
    rolls_per_box: 4,
    width_inches: 18,
    gauge: 80,
    length_feet: 1000,
  },
};

describe("catalog shipment freight", () => {
  it("ignores a fake totalRolls and does not qualify for rgv-local", () => {
    const freight = shipmentFreightFromCatalog(
      [
        {
          sku: "M-20",
          productSlug: "machine-film",
          quantity: 1,
          totalBoxes: 64,
          totalRolls: 640,
          application: "hand",
        },
      ],
      [
        {
          sku: "M-20",
          rolls_count: 20,
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
            half_pallet_length_in: 48,
            half_pallet_width_in: 40,
            half_pallet_height_in: 26,
            rolls_per_box: 1,
            width_inches: 20,
            gauge: 51,
            length_feet: 7000,
          },
        },
      ],
      new Map()
    );

    assert.equal(freight.rolls, 20);
    assert.equal(freight.weightLbs, 634.1);
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

  it("packs 80 ga boxes into package-table tiers and rounds Warp weight up", () => {
    const variant = (sku: string, boxes: number) => ({
      ...HAND_80,
      sku,
      boxes_count: boxes,
      rolls_count: boxes * 4,
    });
    const line = (sku: string, quantity = 1) => ({
      sku,
      productSlug: "stretch-film-18-x-80-ga-x-1000ft",
      quantity,
    });
    const cases = [
      { name: "1 box", lines: [line("b1")], rows: [variant("b1", 1)], weight: 56.85 },
      { name: "16 boxes", lines: [line("b16")], rows: [variant("b16", 16)], weight: 576.6 },
      { name: "32 boxes", lines: [line("b32")], rows: [variant("b32", 32)], weight: 1131.1 },
      { name: "64 boxes", lines: [line("b64")], rows: [variant("b64", 64)], weight: 2240.2 },
      {
        name: "16+16",
        lines: [line("a16"), line("b16")],
        rows: [variant("a16", 16), variant("b16", 16)],
        weight: 1153.2,
      },
      {
        name: "64+16",
        lines: [line("b64"), line("b16")],
        rows: [variant("b64", 64), variant("b16", 16)],
        weight: 2816.8,
      },
      { name: "2x64", lines: [line("b64", 2)], rows: [variant("b64", 64)], weight: 4480.4 },
      {
        name: "loose plus a layer",
        lines: [line("b16"), line("b1", 3)],
        rows: [variant("b16", 16), variant("b1", 1)],
        weight: 702.75,
      },
    ];
    const loose = [
      { boxes: 1, weight: 56.85 },
      { boxes: 2, weight: 91.5 },
      { boxes: 5, weight: 195.45 },
      { boxes: 15, weight: 541.95 },
    ];
    for (const item of loose) {
      const freight = shipmentFreightFromCatalog(
        [line(`loose-${item.boxes}`, item.boxes)],
        [variant(`loose-${item.boxes}`, 1)],
        new Map()
      );
      assert.equal(freight.pieces.length, 1, `${item.boxes} boxes`);
      assert.equal(freight.pieces[0]?.quantity, 1);
      assert.equal(freight.pieces[0]?.lengthIn, 48);
      assert.equal(freight.pieces[0]?.widthIn, 48);
      assert.equal(freight.pieces[0]?.heightIn, 19.5);
      assert.equal(freight.weightLbs, item.weight);
    }
    const mixed = shipmentFreightFromCatalog(
      [line("full", 1), line("extra", 5)],
      [variant("full", 64), variant("extra", 1)],
      new Map()
    );
    assert.equal(mixed.pieces.length, 2);
    assert.equal(mixed.pieces[0]?.heightIn, 78);
    assert.equal(mixed.pieces[0]?.weightLbs, 2240.2);
    assert.equal(mixed.pieces[1]?.heightIn, 19.5);
    assert.equal(mixed.pieces[1]?.weightLbs, 195.45);
    assert.equal(mixed.weightLbs, 2435.65);

    for (const item of cases) {
      const freight = shipmentFreightFromCatalog(item.lines, item.rows, new Map());
      assert.equal(freight.weightLbs, item.weight, item.name);
      const sent = marketItemsFromPieces(freight.pieces).reduce(
        (sum, piece) => sum + piece.weightLbsPerPallet * piece.qty,
        0
      );
      const units = freight.pieces.reduce((sum, piece) => sum + piece.quantity, 0);
      assert.ok(sent >= freight.weightLbs, item.name);
      assert.ok(sent - freight.weightLbs < units, item.name);
    }
  });
});
