import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditCatalogProduct, groupLinesBySku } from "./catalog-freight";
import { shipmentFreightFromCatalog } from "./shipment";

const complete = {
  slug: "film-a",
  application: "hand",
  roll_weight_lbs: 8.66,
  pallet_weight_lbs: 1750.24,
  pallet_dimensions: null as string | null,
  pallet_length_in: 48,
  pallet_width_in: 48,
  pallet_height_in: 78 as number | null,
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
    box_weight_lbs: 35.63,
    pallet_weight_lbs: 1750.24,
    products: { ...complete, slug: sku },
  };
}

describe("catalog freight", () => {
  it("builds every hand tier from that product's own weights and inches", () => {
    for (const boxes of [1, 48]) {
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
      [variant("a", 48), variant("b", 1)],
      new Map()
    );
    assert.equal(freight.pieces.length, 2);
    assert.equal(freight.weightLbs, 1785.87);
  });

  it("uses a product's own full-pallet height from pallet_dimensions", () => {
    const row = variant("tall", 48);
    row.products = { ...complete, slug: "tall-film", pallet_dimensions: "48 x 48 x 60" };
    const full = shipmentFreightFromCatalog([{ sku: "tall", productSlug: "tall-film", quantity: 1 }], [row], new Map());
    assert.equal(full.pieces[0]?.heightIn, 60);
    const boxRow = variant("tall-box", 1);
    boxRow.products = row.products;
    const box = shipmentFreightFromCatalog(
      [{ sku: "tall-box", productSlug: "tall-film", quantity: 1 }],
      [boxRow],
      new Map()
    );
    assert.equal(box.pieces[0]?.heightIn, 19.5);
    assert.equal(box.pieces[0]?.packaging, "box");
  });

  it("uses a 46 in pallet and tier scale weights for automatic film", () => {
    const fullRow = variant("auto-full", 1);
    fullRow.rolls_count = 40;
    fullRow.box_weight_lbs = null;
    fullRow.pallet_weight_lbs = 1250.01;
    fullRow.products = {
      ...complete,
      slug: "stretch-film-20-x-51-ga-x-7000ft",
      application: "machine",
      width_inches: 20,
      gauge: 51,
      length_feet: 7000,
      roll_weight_lbs: 30.600162,
      pallet_weight_lbs: 1250.01,
      pallet_dimensions: "48 x 40 x 46",
      pallet_height_in: 46,
    };
    const full = shipmentFreightFromCatalog(
      [{ sku: "auto-full", productSlug: "stretch-film-20-x-51-ga-x-7000ft", quantity: 1 }],
      [fullRow],
      new Map()
    );
    assert.equal(full.pieces[0]?.heightIn, 46);
    assert.equal(full.pieces[0]?.widthIn, 40);
    assert.equal(full.pieces[0]?.lengthIn, 48);
    assert.equal(full.pieces[0]?.weightLbs, 1250.01);
    const halfRow = variant("auto-half", 1);
    halfRow.rolls_count = 20;
    halfRow.box_weight_lbs = null;
    halfRow.pallet_weight_lbs = 638;
    halfRow.roll_weight_lbs = 30.600162;
    halfRow.products = fullRow.products;
    const half = shipmentFreightFromCatalog(
      [{ sku: "auto-half", productSlug: "stretch-film-20-x-51-ga-x-7000ft", quantity: 1 }],
      [halfRow],
      new Map()
    );
    assert.equal(half.pieces[0]?.heightIn, 46);
    assert.equal(half.pieces[0]?.widthIn, 40);
    // Master half scale weight — not full÷2 (625).
    assert.equal(half.pieces[0]?.weightLbs, 638);
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
    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.weight === "missing" && row.dimensions === "present"));
    assert.match(rows[0]?.fieldsToFill || "", /box_weight_lbs/);
    assert.equal(rows[0]?.boxesOrRolls, "1 box");
    assert.equal(rows[1]?.boxesOrRolls, "48 boxes");
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
