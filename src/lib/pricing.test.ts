import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bracketForBoxCount,
  catalogCardStartingPrice,
  catalogPackageQuote,
  getDisplayPrice,
  formatBoxPriceEquation,
  repriceHandCartLine,
  totalForBoxes,
  unitBoxPriceForCount,
  type BoxTierPrices,
} from "./pricing";

const prices: BoxTierPrices = {
  price1Box: 33.14,
  price16Boxes: 31.67,
  price32Boxes: 30.2,
  price64Boxes: 21.2,
};

describe("box price × box quantity", () => {
  it("selects the Supabase bracket for each box count", () => {
    assert.equal(bracketForBoxCount(1)?.key, "box");
    assert.equal(bracketForBoxCount(15)?.key, "box");
    assert.equal(bracketForBoxCount(16)?.key, "layer");
    assert.equal(bracketForBoxCount(31)?.key, "layer");
    assert.equal(bracketForBoxCount(32)?.key, "half");
    assert.equal(bracketForBoxCount(63)?.key, "half");
    assert.equal(bracketForBoxCount(64)?.key, "full");
    assert.equal(bracketForBoxCount(128)?.key, "full");
  });

  it("prices a full pallet as price_64_boxes × 64", () => {
    const unit = unitBoxPriceForCount(prices, 64);
    assert.equal(unit, 21.2);
    assert.equal(totalForBoxes(unit!, 64), 1356.8);
    assert.equal(
      formatBoxPriceEquation(64, 21.2),
      "64 Boxes × $21.20/box = $1,356.80 USD"
    );
  });

  it("keeps 1–15 boxes on price_1_box", () => {
    assert.equal(totalForBoxes(unitBoxPriceForCount(prices, 10)!, 10), 331.4);
  });

  it("reprices a cart preset from live columns, including a second pallet", () => {
    const onePallet = repriceHandCartLine(
      {
        application: "hand",
        totalBoxes: 64,
        quantity: 1,
        unitPrice: 999,
        totalPrice: 999,
        boxUnitPrice: 1,
      },
      prices
    );
    assert.equal(onePallet.boxUnitPrice, 21.2);
    assert.equal(onePallet.unitPrice, 1356.8);
    assert.equal(onePallet.totalPrice, 1356.8);

    const twoPallets = repriceHandCartLine({ ...onePallet, quantity: 2 }, prices);
    assert.equal(twoPallets.boxUnitPrice, 21.2);
    assert.equal(twoPallets.totalPrice, 2713.6);
  });

  it("multiplies the variant per-box price by the box count for catalog cards", () => {
    assert.deepEqual(
      catalogPackageQuote({
        variants: [{ boxes_count: 16, price: 25.65 }],
      }),
      { boxes: 16, unitBoxPrice: 25.65, total: 410.4 }
    );
    assert.deepEqual(
      catalogPackageQuote({
        variants: [
          { boxes_count: 64, priceUsd: "21.20" },
          { boxes_count: 1, price: "30.00" },
        ],
      }),
      { boxes: 1, unitBoxPrice: 30, total: 30 }
    );
  });

  it("shows a 1-box variant price, then price_1_box, then price_64_boxes", () => {
    assert.equal(
      getDisplayPrice({
        product_variants: [{ boxes_count: 1, price: 25.65 }],
        price_1_box: 10,
      }),
      25.65
    );
    assert.equal(
      getDisplayPrice({
        product_variants: [{ boxes_count: 1, price: 0 }, { boxes_count: 64, price_usd: "21.20" }],
        price_1_box: 33.14,
      }),
      21.2
    );
    assert.equal(getDisplayPrice({ price_1_box: "33.14" }), 33.14);
    assert.equal(getDisplayPrice({ price_64_boxes: 21.2 }), 21.2);
    assert.equal(getDisplayPrice({ product_variants: [{ boxes_count: 1, price: 0 }] }), null);
  });

  it("uses a variant price, then price_64_boxes, then price_1_box on catalog cards", () => {
    assert.deepEqual(
      catalogCardStartingPrice({
        variants: [{ priceUsd: "0" }, { price: "" }],
        price_64_boxes: "21.20",
        price_1_box: "33.14",
      }),
      { amount: 21.2, source: "price_64_boxes" }
    );
    assert.deepEqual(
      catalogCardStartingPrice({
        variants: [],
        boxPrices: { price1Box: 33.14, price16Boxes: null, price32Boxes: null, price64Boxes: null },
      }),
      { amount: 33.14, source: "price_1_box" }
    );
    assert.deepEqual(
      catalogCardStartingPrice({
        variants: [{ priceUsd: "18.50" }],
        price_64_boxes: 21.2,
        price_1_box: 33.14,
      }),
      { amount: 18.5, source: "variant" }
    );
  });

  it("does not invent a discount when the bracket column is empty", () => {
    const partial: BoxTierPrices = {
      price1Box: 40,
      price16Boxes: null,
      price32Boxes: null,
      price64Boxes: null,
    };
    assert.equal(unitBoxPriceForCount(partial, 16), null);
    const line = repriceHandCartLine(
      {
        application: "hand",
        totalBoxes: 16,
        quantity: 1,
        unitPrice: 608,
        totalPrice: 608,
      },
      partial
    );
    assert.equal(line.unitPrice, 608);
    assert.equal(line.totalPrice, 608);
  });
});
