import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { packageTotalWeightLbs } from "../package-weight";
import { marketItemsFromPieces } from "./market-options";
import { freeRgvDelivery } from "./rgv-delivery";
import { ShipmentDataError, shipmentFreightFromCatalog, type FreightVariant } from "./shipment";

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
    assert.equal(freight.weightLbs, 638);
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
      { name: "1 box", lines: [line("b1")], rows: [variant("b1", 1)], weight: 34.65 },
      { name: "16 boxes", lines: [line("b16")], rows: [variant("b16", 16)], weight: 583.58 },
      { name: "32 boxes", lines: [line("b32")], rows: [variant("b32", 32)], weight: 1137.98 },
      { name: "64 boxes", lines: [line("b64")], rows: [variant("b64", 64)], weight: 2240.2 },
      {
        name: "16+16",
        lines: [line("a16"), line("b16")],
        rows: [variant("a16", 16), variant("b16", 16)],
        weight: 1167.16,
      },
      {
        name: "64+16",
        lines: [line("b64"), line("b16")],
        rows: [variant("b64", 64), variant("b16", 16)],
        weight: 2823.78,
      },
      { name: "2x64", lines: [line("b64", 2)], rows: [variant("b64", 64)], weight: 4480.4 },
      {
        name: "loose plus a layer",
        lines: [line("b16"), line("b1", 3)],
        rows: [variant("b16", 16), variant("b1", 1)],
        weight: 687.53,
      },
    ];
    const loose = [
      { boxes: 1, weight: 34.65 },
      { boxes: 2, weight: 69.3 },
      { boxes: 5, weight: 173.25 },
      { boxes: 15, weight: 519.75 },
    ];
    for (const item of loose) {
      const freight = shipmentFreightFromCatalog(
        [line(`loose-${item.boxes}`, item.boxes)],
        [variant(`loose-${item.boxes}`, 1)],
        new Map()
      );
      assert.equal(freight.pieces.length, 1, `${item.boxes} boxes`);
      assert.equal(freight.pieces[0]?.quantity, item.boxes);
      assert.equal(freight.pieces[0]?.packaging, "box");
      assert.equal(freight.pieces[0]?.lengthIn, 11);
      assert.equal(freight.pieces[0]?.widthIn, 11);
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
    assert.equal(mixed.pieces[1]?.lengthIn, 11);
    assert.equal(mixed.pieces[1]?.widthIn, 11);
    assert.equal(mixed.pieces[1]?.heightIn, 19.5);
    assert.equal(mixed.pieces[1]?.quantity, 5);
    assert.equal(mixed.pieces[1]?.weightLbs, 173.25);
    assert.equal(mixed.weightLbs, 2413.45);

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

  it("uses the cart line gross weight when the catalog row has no weights", () => {
    const freight = shipmentFreightFromCatalog(
      [
        {
          sku: "FST-154015-64B",
          productSlug: "stretch-film-15-x-40-ga-x-1500ft",
          quantity: 1,
          totalBoxes: 64,
          totalRolls: 256,
          application: "hand",
          weightLbs: 1173.5,
        },
      ],
      [],
      new Map()
    );
    assert.equal(freight.pieces[0]?.weightLbs, 1173.5);
    assert.ok(freight.weightLbs > 0);
  });

  it("sends the spec-matrix gross weight, including a tier that only has a sibling box weight", () => {
    const matrix = (boxes: number, rolls: number) =>
      packageTotalWeightLbs({
        boxes,
        rolls,
        boxWeightLbs: 18,
        palletWeightLbs: 1173.5,
      });
    assert.equal(matrix(1, 4), 18);
    assert.equal(matrix(16, 64), 317.18);
    assert.equal(matrix(32, 128), 605.18);

    const freight = shipmentFreightFromCatalog(
      [{ sku: "FST-1B", productSlug: "stretch-film-15-x-40-ga-x-1500ft", quantity: 1 }],
      [
        {
          sku: "FST-1B",
          rolls_count: 4,
          boxes_count: 1,
          roll_weight_lbs: null,
          box_weight_lbs: null,
          pallet_weight_lbs: null,
          products: {
            slug: "stretch-film-15-x-40-ga-x-1500ft",
            application: "hand",
            roll_weight_lbs: null,
            pallet_weight_lbs: null,
            pallet_dimensions: null,
            rolls_per_box: 4,
            width_inches: 15,
            gauge: 40,
            length_feet: 1500,
          },
        },
        {
          sku: "FST-64B",
          rolls_count: 256,
          boxes_count: 64,
          roll_weight_lbs: null,
          box_weight_lbs: 18,
          pallet_weight_lbs: 1173.5,
          products: {
            slug: "stretch-film-15-x-40-ga-x-1500ft",
            application: "hand",
            roll_weight_lbs: null,
            pallet_weight_lbs: 1173.5,
            pallet_dimensions: null,
            rolls_per_box: 4,
            width_inches: 15,
            gauge: 40,
            length_feet: 1500,
          },
        },
      ],
      new Map()
    );
    assert.equal(freight.pieces[0]?.weightLbs, 18);
    assert.ok(freight.weightLbs > 0);
  });

  it("builds every catalog tier from production-shaped rows, including empty pallet dimensions", () => {
    const films: Array<{
      slug: string;
      application: "hand" | "machine";
      boxWeightLbs: number | null;
      rollWeightLbs: number | null;
      palletWeightLbs: number | null;
      widthInches: number | string;
    }> = [
      ["stretch-film-18-x-60-ga-x-1000ft", "hand", 24.6, 6.15, 1596.7, "18"],
      ["stretch-film-18-x-70-ga-x-1000ft", "hand", 27.51, 6.88, 1783, 18],
      ["stretch-film-18-x-80-ga-x-1000ft", "hand", 34.65, 8.66, 2240.2, "18"],
      ["stretch-film-18-x-60-ga-x-1500ft", "hand", 30.42, 7.61, 1969.2, 18],
      ["stretch-film-18-x-70-ga-x-1500ft", "hand", 34.74, 8.69, 2245.8, 18],
      ["stretch-film-18-x-80-ga-x-1500ft", "hand", 39.07, 9.77, 2522.3, 18],
      ["stretch-film-15-x-40-ga-x-1500ft", "hand", 18, 4.5, 1173.5, 15],
      ["stretch-film-15-x-60-ga-x-1000ft", "hand", 25.13, 5.42, 1637.5, 15],
      ["stretch-film-15-x-60-ga-x-1500ft", "hand", 25.13, 6.28, 1630.5, 15],
      ["stretch-film-15-x-70-ga-x-1500ft", "hand", 28.75, 7.19, 1862, 15],
      ["stretch-film-15-x-80-ga-x-1500ft", "hand", 32.36, 8.09, 2093.3, 15],
      ["stretch-film-20-x-51-ga-x-7000ft", "machine", null, 30.600162, 1250.01, "20"],
      ["stretch-film-20-x-51-ga-x-9000ft", "machine", null, 38.779312, 1577.71, 20],
      ["stretch-film-20-x-60-ga-x-5000ft", "machine", null, 25.9, 1058, 20],
      ["stretch-film-20-x-70-ga-x-5000ft", "machine", null, 30.049006, 1228.17, 20],
      ["stretch-film-20-x-80-ga-x-5000ft", "machine", null, 34.06142, 1288.51, 20],
      ["stretch-film-20-x-60-ga-x-6000ft", "machine", null, null, null, 20],
      ["stretch-film-20-x-70-ga-x-6000ft", "machine", null, null, null, 20],
      ["stretch-film-20-x-80-ga-x-6000ft", "machine", null, null, null, 20],
    ].map(([slug, application, boxWeightLbs, rollWeightLbs, palletWeightLbs, widthInches]) => ({
      slug: String(slug),
      application: application as "hand" | "machine",
      boxWeightLbs: boxWeightLbs as number | null,
      rollWeightLbs: rollWeightLbs as number | null,
      palletWeightLbs: palletWeightLbs as number | null,
      widthInches: widthInches as number | string,
    }));
    const palletShapes: unknown[] = [null, "", "48 x 48", {}, "48 x 48 x 78"];
    const handTiers = [1, 16, 32, 64];
    const machineTiers = [20, 40];

    for (const film of films) {
      const tiers = film.application === "hand" ? handTiers : machineTiers;
      for (const tier of tiers) {
        for (const palletDimensions of palletShapes) {
          const sku = `${film.slug}-${tier}`;
          const label = `${film.slug} ${tier} ${JSON.stringify(palletDimensions)}`;
          try {
            const freight = shipmentFreightFromCatalog(
              [{ sku, productSlug: film.slug, quantity: 1 }],
              [
                {
                  sku,
                  rolls_count: String(film.application === "hand" ? tier * 4 : tier),
                  boxes_count: film.application === "hand" ? String(tier) : "1",
                  roll_weight_lbs: film.rollWeightLbs == null ? null : String(film.rollWeightLbs),
                  box_weight_lbs: film.boxWeightLbs == null ? null : String(film.boxWeightLbs),
                  pallet_weight_lbs: film.palletWeightLbs == null ? null : String(film.palletWeightLbs),
                  products: {
                    slug: film.slug,
                    application: film.application,
                    roll_weight_lbs: film.rollWeightLbs,
                    pallet_weight_lbs: film.palletWeightLbs,
                    pallet_dimensions: palletDimensions,
                    rolls_per_box: film.application === "hand" ? 4 : 1,
                    width_inches: film.widthInches,
                    gauge: 80,
                    length_feet: 1000,
                  },
                } as unknown as FreightVariant,
              ],
              new Map()
            );
            assert.ok(freight.pieces.length > 0, label);
            for (const piece of freight.pieces) {
              assert.ok(piece.weightLbs > 0, label);
              assert.ok(piece.lengthIn > 0 && piece.widthIn > 0 && piece.heightIn > 0, label);
            }
            marketItemsFromPieces(freight.pieces);
            if (film.rollWeightLbs == null && film.palletWeightLbs == null) {
              assert.fail(`${label} returned pieces without a package weight`);
            }
          } catch (error) {
            assert.ok(error instanceof ShipmentDataError, `${label} threw ${error instanceof Error ? error.name : typeof error}`);
            assert.ok(error.code === "missing_dims" || error.code === "missing_weight", `${label} ${error.code}`);
            if (film.rollWeightLbs != null || film.palletWeightLbs != null) {
              assert.fail(`${label} should build pieces, got ${error.code}: ${error.message}`);
            }
            assert.equal(error.code, "missing_weight", label);
          }
        }
      }
    }
  });

  it("sends a single box as 11 x 11 x 19.5 and pallet tiers with a 10 in deck", () => {
    const product = {
      slug: "stretch-film-15-x-40-ga-x-1500ft",
      application: "hand",
      roll_weight_lbs: 4.5,
      pallet_weight_lbs: 1175.74,
      pallet_dimensions: "48 x 48 x 66",
      rolls_per_box: 4,
      width_inches: 15,
      gauge: 40,
      length_feet: 1500,
    };
    const quote = (boxes: number) =>
      shipmentFreightFromCatalog(
        [{ sku: `FEL-${boxes}`, productSlug: product.slug, quantity: 1 }],
        [
          {
            sku: `FEL-${boxes}`,
            rolls_count: boxes * 4,
            boxes_count: boxes,
            roll_weight_lbs: null,
            box_weight_lbs: 18,
            pallet_weight_lbs: 1175.74,
            products: product,
          },
        ],
        new Map()
      );
    const one = quote(1);
    assert.equal(one.pieces[0]?.lengthIn, 11);
    assert.equal(one.pieces[0]?.widthIn, 11);
    assert.equal(one.pieces[0]?.heightIn, 16.5);
    assert.equal(one.pieces[0]?.weightLbs, 18);
    assert.equal(one.pieces[0]?.packaging, "box");
    const layer = quote(16);
    assert.equal(layer.pieces[0]?.lengthIn, 48);
    assert.equal(layer.pieces[0]?.widthIn, 48);
    assert.equal(layer.pieces[0]?.heightIn, 29.5);
    assert.equal(layer.pieces[0]?.weightLbs, 317.18);
    const half = quote(32);
    assert.equal(half.pieces[0]?.heightIn, 39);
    assert.equal(half.pieces[0]?.weightLbs, 605.18);
    const full = quote(64);
    assert.equal(full.pieces[0]?.heightIn, 78);
    assert.equal(full.pieces[0]?.weightLbs, 1175.74);
    const sent = marketItemsFromPieces(one.pieces)[0];
    assert.equal(sent?.lengthIn, 11);
    assert.equal(sent?.widthIn, 11);
    assert.equal(sent?.heightIn, 16.5);
    assert.equal(sent?.weightLbsPerPallet, 18);
    const layerSent = marketItemsFromPieces(layer.pieces)[0];
    assert.equal(layerSent?.heightIn, 29.5);
    assert.equal(layerSent?.weightLbsPerPallet, 318);
  });
});
