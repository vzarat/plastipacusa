import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareInStockFirst, sortProductsByDimensions } from "./products";

describe("catalog stock sort", () => {
  it("keeps width, gauge, and length order inside the in-stock and sold-out groups", () => {
    const sorted = sortProductsByDimensions([
      { slug: "sold-15", width: 15, gauge: 40, lengthFeet: 1500, isSoldOut: true },
      { slug: "in-18", width: 18, gauge: 80, lengthFeet: 1000, stockQuantity: 4 },
      { slug: "in-15-long", width: 15, gauge: 40, lengthFeet: 1500, stock_qty: 2 },
      { slug: "in-15", width: 15, gauge: 40, lengthFeet: 1000, is_available: true, stockQuantity: 1 },
      { slug: "empty", width: 18, gauge: 60, lengthFeet: 1500, stock_qty: 0 },
    ]);

    assert.deepEqual(
      sorted.map((product) => product.slug),
      ["in-15", "in-15-long", "in-18", "sold-15", "empty"]
    );
  });

  it("applies a price order only after availability", () => {
    const products = [
      { slug: "cheap-out", startingPrice: 10, isSoldOut: true },
      { slug: "dear-in", startingPrice: 40, stockQuantity: 3 },
      { slug: "mid-in", startingPrice: 20, stockQuantity: 1 },
    ];
    const sorted = [...products].sort(
      compareInStockFirst((a, b) => a.startingPrice - b.startingPrice)
    );
    assert.deepEqual(
      sorted.map((product) => product.slug),
      ["mid-in", "dear-in", "cheap-out"]
    );
  });
});
