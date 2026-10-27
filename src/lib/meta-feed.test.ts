import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMetaFeedCsv, type MetaFeedProduct } from "./meta-feed";

const hiddenHandFilm: MetaFeedProduct = {
  id: "product-18-80",
  title: 'Stretch Film 18" X 80 GA X 1000FT',
  slug: "stretch-film-18-80-1000",
  description: 'Industrial 18" film, sold by the box.',
  images: ["https://cdn.example.com/film-18.png"],
  type: "hand",
  width_inches: 18,
  product_variants: [
    { sku: "STD-SF188010-1B", price: 33.14, boxes_count: 1, rolls_count: 4 },
    { sku: "STD-SF188010-64B", price: 32.71, boxes_count: 64, rolls_count: 256 },
  ],
};

describe("meta catalog feed", () => {
  it("emits one unique row per variant sku, including a hidden hand film", () => {
    const csv = buildMetaFeedCsv([
      hiddenHandFilm,
      {
        ...hiddenHandFilm,
        id: "product-18-80-copy",
        slug: "duplicate-source",
        product_variants: [{ sku: "STD-SF188010-64B", price: 32.71, boxes_count: 64 }],
      },
    ]);
    const lines = csv.trim().split("\n");
    const ids = lines.slice(1).map((line) => line.split(",")[0]);
    assert.deepEqual(ids, ["STD-SF188010-1B", "STD-SF188010-64B"]);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => id.length > 0));
    const databaseSkus = (hiddenHandFilm.product_variants || []).map((variant) => variant.sku);
    for (const id of ids) assert.ok(databaseSkus.includes(id));
    assert.match(lines[2], /2093\.44 USD/);
    assert.match(lines[1], /product-18-80/);
    assert.match(lines[2], /product-18-80/);
  });

  it("quotes the product title so the inch mark and commas stay inside one cell", () => {
    const csv = buildMetaFeedCsv([hiddenHandFilm]);
    assert.match(csv, /"Stretch Film 18"" X 80 GA X 1000FT \| 64 Boxes"/);
    assert.match(csv, /"Industrial 18"" film, sold by the box\."/);
    assert.match(csv, /variant=STD-SF188010-64B/);
    assert.match(csv, /in stock,new,/);
    assert.match(csv, /,Plastipac,product-18-80/);
  });
});
