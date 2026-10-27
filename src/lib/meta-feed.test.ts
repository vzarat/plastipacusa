import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMetaFeedCsv, metaFeedImageLink, type MetaFeedProduct } from "./meta-feed";

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

  it("keeps a public png and replaces a missing or blocked image", () => {
    const hand = { sku: "STD-SF186010-1B", price: 30, boxes_count: 1, rolls_count: 4 };
    const machine = { sku: "HPF-SF207050-HLP", price: 998.6, boxes_count: 0, rolls_count: 20 };
    assert.equal(
      metaFeedImageLink(
        { ...hiddenHandFilm, images: ["https://cdn.example.com/roll photo.png"] },
        hiddenHandFilm.product_variants![1]
      ),
      "https://cdn.example.com/roll%20photo.png"
    );
    assert.equal(
      metaFeedImageLink(
        {
          ...hiddenHandFilm,
          images: [
            "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          ],
        },
        hand
      ),
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/productos_plastipac_manual.png"
    );
    assert.equal(
      metaFeedImageLink(
        {
          id: "machine",
          slug: "machine-film",
          title: "Genesis",
          width_inches: 20,
          images: [
            "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png",
          ],
        },
        machine
      ),
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/AUTOMATIC_STRETCH_FILM.png"
    );
    assert.equal(
      metaFeedImageLink(
        {
          id: "machine",
          slug: "machine-film",
          title: "Genesis",
          width_inches: 20,
          images: ["https://www.plastipacusa.com/images/products/machine-film.png"],
        },
        machine
      ),
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/AUTOMATIC_STRETCH_FILM.png"
    );
    assert.equal(
      metaFeedImageLink({ id: "machine-2", slug: "hpf-207", title: "Genesis", images: [] }, machine),
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/AUTOMATIC_STRETCH_FILM.png"
    );
  });
});
