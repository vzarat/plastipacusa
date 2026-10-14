import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bracketForBoxCount,
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
