import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareInStockFirst, isCatalogInStock, sortCatalogByAvailability, sortProductsByDimensions } from "./products";

describe("catalog stock sort", () => {
  const films = [
    { slug: "sold-15", width: 15, gauge: 40, lengthFeet: 1500, isSoldOut: true, startingPrice: 10 },
    { slug: "in-18", width: 18, gauge: 80, lengthFeet: 1000, stockQuantity: 4, startingPrice: 30 },
    { slug: "in-15-long", width: 15, gauge: 40, lengthFeet: 1500, stock_qty: 2, startingPrice: 22 },
    { slug: "in-15", width: 15, gauge: 40, lengthFeet: 1000, is_available: true, stockQuantity: 1, startingPrice: 28 },
    { slug: "empty", width: 18, gauge: 60, lengthFeet: 1500, stock_qty: 0, startingPrice: 5 },
    { slug: "untracked", width: 20, gauge: 70, lengthFeet: 5000, stockQuantity: null, startingPrice: 40 },
  ];

  it("keeps dimension order on the category page even when a film is sold out", () => {
    const sorted = sortProductsByDimensions(films);
    assert.deepEqual(
      sorted.map((product) => product.slug),
      ["in-15", "sold-15", "in-15-long", "empty", "in-18", "untracked"]
    );
  });

  it("puts in-stock films first and keeps width, gauge, length, then price inside each group", () => {
    const sorted = sortCatalogByAvailability(films, (left, right) => {
      const width = (left.width || 0) - (right.width || 0);
      if (width !== 0) return width;
      const gauge = (left.gauge || 0) - (right.gauge || 0);
      if (gauge !== 0) return gauge;
      const length = (left.lengthFeet || 0) - (right.lengthFeet || 0);
      if (length !== 0) return length;
      return left.startingPrice - right.startingPrice;
    });
    assert.deepEqual(
      sorted.map((product) => product.slug),
      ["in-15", "in-15-long", "in-18", "untracked", "sold-15", "empty"]
    );
  });

  it("applies a price order only after availability", () => {
    const products = [
      { slug: "cheap-out", startingPrice: 10, isSoldOut: true },
      { slug: "dear-in", startingPrice: 40, stockQuantity: 3 },
      { slug: "mid-in", startingPrice: 20, stockQuantity: 1 },
      { slug: "zero", startingPrice: 1, stock_qty: 0 },
    ];
    const sorted = sortCatalogByAvailability(
      products,
      (a, b) => a.startingPrice - b.startingPrice
    );
    assert.deepEqual(
      sorted.map((product) => product.slug),
      ["mid-in", "dear-in", "zero", "cheap-out"]
    );
  });

  it("treats zero pallet stock as sold out and leaves untracked stock available", () => {
    assert.equal(isCatalogInStock({ stock_qty: 0, isSoldOut: false }), false);
    assert.equal(isCatalogInStock({ stockQuantity: null, isSoldOut: false }), true);
    assert.equal(isCatalogInStock({ stockQuantity: 0.5 }), true);
    assert.equal(isCatalogInStock({ is_available: false, stockQuantity: 4 }), false);
    assert.equal(compareInStockFirst(() => 0)({ stock_qty: 0 }, { stockQuantity: 2 }), 1);
  });
});
