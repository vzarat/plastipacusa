import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMetaCartLines, parseMetaProducts, type MetaCatalogProduct } from "./meta-checkout";

const handFilm: MetaCatalogProduct = {
  id: "film-15",
  slug: "stretch-film-15-40-1500",
  title: '15" x 40 GA x 1500',
  application: "hand",
  widthInches: 15,
  gauge: 40,
  lengthFeet: 1500,
  imageUrl: "https://example.com/film.png",
  packageOptions: [
    {
      sku: "ELT-SF154015-1B",
      price: 28.21,
      label: "1 Box (4 Rolls)",
      boxes: 1,
      rolls: 4,
      boxUnitPrice: 28.21,
    },
    {
      sku: "ELT-SF154015-64B",
      price: 1356.8,
      label: "64 Boxes (256 Rolls)",
      boxes: 64,
      rolls: 256,
      boxUnitPrice: 21.2,
    },
  ],
  variants: [{ id: "v1", sku: "ELT-SF154015-1B", weightLbs: 12, rollsPerBox: 4 }],
};

describe("meta checkout url", () => {
  it("parses sku quantities and legacy aliases", () => {
    const parsed = parseMetaProducts("FEL-154015-1B:2, ELT-SF154015-64B:1");
    assert.deepEqual(
      parsed?.map((line) => [line.sku, line.quantity]),
      [
        ["FEL-154015-1B", 2],
        ["ELT-SF154015-64B", 1],
      ]
    );
  });

  it("rejects a missing or broken products parameter", () => {
    assert.equal(parseMetaProducts(null), null);
    assert.equal(parseMetaProducts(""), null);
    assert.equal(parseMetaProducts("ELT-SF154015-1B"), null);
    assert.equal(parseMetaProducts("ELT-SF154015-1B:0"), null);
    assert.equal(parseMetaProducts("ELT-SF154015-1B:1,bad"), null);
  });

  it("matches catalog skus, including a legacy prefix, into cart lines", () => {
    const requested = parseMetaProducts("FEL-154015-1B:2");
    assert.ok(requested);
    const lines = buildMetaCartLines(requested, [handFilm]);
    assert.equal(lines?.[0].sku, "ELT-SF154015-1B");
    assert.equal(lines?.[0].quantity, 2);
    assert.equal(lines?.[0].unitPrice, 28.21);
    assert.equal(lines?.[0].productSlug, handFilm.slug);
  });

  it("rejects a request when any sku is unknown or sold out", () => {
    const unknown = parseMetaProducts("ELT-SF154015-1B:1,NO-SUCH:1");
    assert.equal(buildMetaCartLines(unknown || [], [handFilm]), null);
    const soldOut = parseMetaProducts("ELT-SF154015-1B:1");
    assert.equal(buildMetaCartLines(soldOut || [], [{ ...handFilm, isSoldOut: true }]), null);
  });
});
