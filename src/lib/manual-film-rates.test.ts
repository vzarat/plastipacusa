import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertManualFilmRateTotals,
  findManualFilmRate,
  MANUAL_FILM_OFFICIAL_RATES,
  quoteManualFilmLine,
} from "./manual-film-rates";
import {
  HAND_FULL_PALLET_BOXES,
  repriceHandCartLine,
  totalForBoxes,
  unitBoxPriceForCount,
} from "./pricing";

describe("manual film official rates", () => {
  it("keeps published full-pallet totals equal to rate × 48", () => {
    assertManualFilmRateTotals();
    assert.equal(MANUAL_FILM_OFFICIAL_RATES.length, 8);
  });

  it("quotes 1-box lines from the single-box rate", () => {
    const row = findManualFilmRate({ widthInches: 18, gauge: 80, lengthFeet: 1000 });
    assert.ok(row);
    const one = quoteManualFilmLine(row!, "box", 1);
    assert.equal(one.pricePerBox, 32.31);
    assert.equal(one.lineTotal, 32.31);
    const ten = quoteManualFilmLine(row!, "box", 10);
    assert.equal(ten.lineTotal, 323.1);
  });

  it("quotes full pallets from the discounted box rate × 48", () => {
    const row = findManualFilmRate({ slug: "stretch-film-15-x-60-ga-x-1000ft" });
    assert.ok(row);
    const pallet = quoteManualFilmLine(row!, "full", 1);
    assert.equal(pallet.boxes, HAND_FULL_PALLET_BOXES);
    assert.equal(pallet.rolls, 192);
    assert.equal(pallet.pricePerBox, 20.39);
    assert.equal(pallet.packageTotal, 978.72);
    assert.equal(pallet.lineTotal, 978.72);
    const two = quoteManualFilmLine(row!, "full", 2);
    assert.equal(two.lineTotal, 1957.44);
  });

  it("reprices cart lines with 1-box rate under 48 and pallet rate at 48", () => {
    const row = findManualFilmRate({ widthInches: 18, gauge: 60, lengthFeet: 1000 })!;
    const prices = {
      price1Box: row.price1Box,
      price16Boxes: null,
      price32Boxes: null,
      price64Boxes: row.priceFullPalletBox,
    };
    assert.equal(unitBoxPriceForCount(prices, 1), 24.98);
    assert.equal(unitBoxPriceForCount(prices, 12), 24.98);
    assert.equal(unitBoxPriceForCount(prices, 47), 24.98);
    assert.equal(unitBoxPriceForCount(prices, 48), 23.86);
    assert.equal(totalForBoxes(23.86, 48), 1145.28);

    const boxes = repriceHandCartLine(
      {
        application: "hand",
        totalBoxes: 1,
        quantity: 3,
        unitPrice: 1,
        totalPrice: 1,
        boxUnitPrice: 1,
      },
      prices
    );
    assert.equal(boxes.boxUnitPrice, 24.98);
    assert.equal(boxes.unitPrice, 24.98);
    assert.equal(boxes.totalPrice, 74.94);

    const pallet = repriceHandCartLine(
      {
        application: "hand",
        totalBoxes: 48,
        quantity: 1,
        unitPrice: 1,
        totalPrice: 1,
        boxUnitPrice: 1,
      },
      prices
    );
    assert.equal(pallet.boxUnitPrice, 23.86);
    assert.equal(pallet.unitPrice, 1145.28);
    assert.equal(pallet.totalPrice, 1145.28);
  });
});
