import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditCatalogProduct, groupLinesBySku } from "./catalog-freight";
import { ShipmentDataError, shipmentFreightFromCatalog } from "./shipment";

const complete = {
  slug: "film-a",
  application: "hand",
  roll_weight_lbs: 8.66,
  pallet_weight_lbs: 2240.2,
  pallet_dimensions: null as string | null,
  pallet_length_in: 48,
  pallet_width_in: 48,
  pallet_height_in: 80 as number | null,
  half_pallet_length_in: 48,
  half_pallet_width_in: 48,
  half_pallet_height_in: 42,
  layer_length_in: 48 as number | null,
  layer_width_in: 48 as number | null,
  layer_height_in: 24 as number | null,
  box_length_in: 12,
  box_width_in: 12,
  box_height_in: 10,
  rolls_per_box: 4,
  width_inches: 18 as number | null,
  gauge: 80,
  length_feet: 1000,
};

function variant(sku: string, boxes: number) {
  return {
    sku,
    rolls_count: boxes * 4,
    boxes_count: boxes,
    roll_weight_lbs: 8.66,
    box_weight_lbs: 34.65,
    pallet_weight_lbs: 2240.2,
    products: { ...complete, slug: sku },
  };
}

describe("catalog freight", () => {
  it("builds every hand tier from that product's own weights and inches", () => {
    for (const boxes of [1, 16, 32, 64]) {
      const freight = shipmentFreightFromCatalog(
        [{ sku: `b${boxes}`, productSlug: `b${boxes}`, quantity: 1 }],
        [variant(`b${boxes}`, boxes)],
        new Map()
      );
      assert.ok(freight.pieces.length > 0, String(boxes));
      for (const piece of freight.pieces) {
        assert.ok(piece.weightLbs > 0);
        assert.ok(piece.lengthIn > 0 && piece.widthIn > 0 && piece.heightIn > 0);
      }
    }
  });

  it("does not merge two products onto one pallet", () => {
    const freight = shipmentFreightFromCatalog(
      [
        { sku: "a", productSlug: "a", quantity: 1 },
        { sku: "b", productSlug: "b", quantity: 1 },
      ],
      [variant("a", 64), variant("b", 16)],
      new Map()
    );
    assert.equal(freight.pieces.length, 2);
    assert.equal(freight.weightLbs, 2816.8);
  });

  it("uses a product's own full-pallet height and derives the other tiers", () => {
    const row = variant("tall", 64);
    row.products = { ...complete, slug: "tall-film", pallet_dimensions: "48 x 48 x 60" };
    const full = shipmentFreightFromCatalog([{ sku: "tall", productSlug: "tall-film", quantity: 1 }], [row], new Map());
    assert.equal(full.pieces[0]?.heightIn, 60);
    const halfRow = variant("tall-half", 32);
    halfRow.products = row.products;
    const half = shipmentFreightFromCatalog(
      [{ sku: "tall-half", productSlug: "tall-film", quantity: 1 }],
      [halfRow],
      new Map()
    );
    assert.equal(half.pieces[0]?.heightIn, 30);
    const layerRow = variant("tall-layer", 16);
    layerRow.products = row.products;
    const layer = shipmentFreightFromCatalog(
      [{ sku: "tall-layer", productSlug: "tall-film", quantity: 1 }],
      [layerRow],
      new Map()
    );
    assert.equal(layer.pieces[0]?.heightIn, 15);
  });

  it("names the product when a machine film has no height", () => {
    const row = variant("bare", 1);
    row.rolls_count = 20;
    row.products = {
      ...complete,
      slug: "bare-machine",
      application: "machine",
      pallet_dimensions: null,
      pallet_height_in: null,
      width_inches: null,
    };
    assert.throws(
      () => shipmentFreightFromCatalog([{ sku: "bare", productSlug: "bare-machine", quantity: 1 }], [row], new Map()),
      (error: unknown) =>
        error instanceof ShipmentDataError &&
        error.code === "missing_dims" &&
        error.message.includes("MISSING_DIMS") &&
        error.message.includes("bare-machine")
    );
  });

  it("lists missing package-table fields without inventing them", () => {
    const rows = auditCatalogProduct({
      name: "Bare Film",
      slug: "bare-film",
      application: "hand",
      boxWeightLbs: null,
      palletWeightLbs: null,
      boxesCount: null,
      rollsCount: null,
      dimensions: {},
    });
    assert.equal(rows.length, 4);
    assert.ok(rows.every((row) => row.weight === "missing" && row.dimensions === "present"));
    assert.match(rows[0]?.fieldsToFill || "", /box_weight_lbs/);
  });

  it("packs the same sku together and leaves different skus apart", () => {
    const grouped = groupLinesBySku([
      { sku: "a", productSlug: "a", quantity: 1 },
      { sku: "a", productSlug: "a", quantity: 1 },
      { sku: "b", productSlug: "b", quantity: 1 },
    ]);
    assert.equal(grouped.length, 2);
    assert.equal(grouped.find((line) => line.sku === "a")?.quantity, 2);
  });
});
