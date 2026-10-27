import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HAND_CATALOG_PALLET_LABEL,
  boxTierPricesFromVariants,
  bracketForBoxCount,
  buildHandFullPalletCartItem,
  catalogCardStartingPrice,
  catalogPackageQuote,
  getDisplayPrice,
  handCatalogQuote,
  handCatalogUnitPrice,
  perBoxPriceFromVariant,
  preferredHandTier,
  formatBoxPriceEquation,
  handCartQuote,
  normalizeHandPackageBoxes,
  quoteTierPrice,
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
        application: "hand",
        variants: [
          { boxes_count: 64, price: "21.20" },
          { boxes_count: 1, price: "30.00" },
        ],
      }),
      { boxes: 64, unitBoxPrice: 21.2, total: 1356.8 }
    );
  });

  it("reads product_variants.price as the per-box rate", () => {
    assert.equal(perBoxPriceFromVariant({ boxes_count: 64, price: 21.2 }, 64), 21.2);
    assert.equal(perBoxPriceFromVariant({ boxes_count: 64, price: 21.2, price_usd: 1356.8 }, 64), 21.2);
    assert.equal(totalForBoxes(perBoxPriceFromVariant({ price: 21.2 }, 64)!, 64), 1356.8);
    assert.deepEqual(
      catalogPackageQuote({
        application: "hand",
        variants: [{ boxes_count: 64, price: 21.2 }],
      }),
      { boxes: 64, unitBoxPrice: 21.2, total: 1356.8 }
    );
  });

  it("prices the hand catalog from the 64-box variant", () => {
    const film15 = {
      application: "hand",
      product_variants: [
        { boxes_count: 1, price: 28.21 },
        { boxes_count: 16, price: 25.65 },
        { boxes_count: 32, price: 23.32 },
        { boxes_count: 64, price: 21.2 },
      ],
    };
    assert.equal(handCatalogUnitPrice(film15), 21.2);
    assert.equal(getDisplayPrice(film15), 21.2);
    assert.equal(
      handCatalogUnitPrice({
        application: "hand",
        variants: [
          { boxes_count: 1, price: 40 },
          { boxes_count: 64, price: 32.71 },
        ],
      }),
      32.71
    );
    assert.equal(
      handCatalogQuote({
        application: "hand",
        variants: [{ boxes_count: 64, price: 30.79 }, { boxes_count: 1, price: 36 }],
      })?.pricePerBox,
      30.79
    );
    assert.equal(HAND_CATALOG_PALLET_LABEL, "Full pallet · 64 boxes · 256 rolls");
    const pallet = quoteTierPrice(21.2, 64, 1);
    assert.equal(pallet.pricePerBox, 21.2);
    assert.equal(pallet.total, 1356.8);
    const pricesFromVariants = boxTierPricesFromVariants(film15.product_variants);
    const line = repriceHandCartLine(
      {
        application: "hand",
        totalBoxes: 64,
        quantity: 1,
        unitPrice: 1,
        totalPrice: 1,
        boxUnitPrice: 0,
      },
      pricesFromVariants
    );
    assert.equal(line.boxUnitPrice, 21.2);
    assert.equal(line.unitPrice, 1356.8);
    assert.equal(line.totalPrice, 1356.8);
    assert.equal(
      preferredHandTier([
        { tierKey: "box", boxes: 1 },
        { tierKey: "layer", boxes: 16 },
        { tierKey: "half", boxes: 32 },
        { tierKey: "full", boxes: 64 },
      ])?.tierKey,
      "full"
    );
    const product = {
      id: 15,
      slug: "15-x-60-x-1000",
      title: "15 x 60 x 1000",
      application: "hand",
      width_inches: 15,
      gauge: 60,
      length_feet: 1000,
      imageUrl: "https://example.com/film.png",
    };
    const variant64 = {
      id: "v64",
      sku: "F1560-64",
      boxes_count: 64,
      price: 21.2,
      pallet_weight_lbs: 420,
    };
    const cartLine = buildHandFullPalletCartItem(product, variant64);
    assert.equal(cartLine?.rollsPerBox, 4);
    assert.equal(cartLine?.totalBoxes, 64);
    assert.equal(cartLine?.totalRolls, 256);
    assert.equal(cartLine?.quantity, 1);
    assert.equal(cartLine?.boxUnitPrice, 21.2);
    assert.equal(cartLine?.unitPrice, 1356.8);
    assert.equal(cartLine?.weightLbs, "420.00");
    assert.equal(buildHandFullPalletCartItem({ ...product, width_inches: null }, variant64), null);
    assert.equal(buildHandFullPalletCartItem(product, null), null);
    assert.equal(
      handCatalogUnitPrice({
        application: "hand",
        variants: [
          { boxes_count: 1, price: 28.21 },
          { boxes_count: 16, price: 25.65 },
        ],
      }),
      25.65
    );
  });

  it("shows a 1-box variant price when that is the only hand tier", () => {
    assert.equal(
      getDisplayPrice({
        application: "hand",
        product_variants: [{ boxes_count: 1, price: 25.65 }],
      }),
      25.65
    );
    assert.equal(
      getDisplayPrice({
        application: "hand",
        product_variants: [{ boxes_count: 1, price: 0 }, { boxes_count: 64, price: 21.2 }],
      }),
      21.2
    );
    assert.equal(getDisplayPrice({ application: "hand", price_1_box: "33.14" }), null);
    assert.equal(getDisplayPrice({ application: "hand", product_variants: [{ boxes_count: 1, price: 0 }] }), null);
  });

  it("uses the 64-box variant price on hand catalog cards", () => {
    assert.deepEqual(
      catalogCardStartingPrice({
        application: "hand",
        variants: [{ price: 0 }, { boxes_count: 64, price: 21.2 }],
      }),
      { amount: 21.2, source: "price_64_boxes" }
    );
    assert.deepEqual(
      catalogCardStartingPrice({
        application: "hand",
        variants: [],
        boxPrices: { price1Box: 33.14, price16Boxes: null, price32Boxes: null, price64Boxes: null },
      }),
      { amount: null, source: null }
    );
    assert.deepEqual(
      catalogCardStartingPrice({
        application: "hand",
        variants: [{ boxes_count: 1, price: 18.5 }, { boxes_count: 64, price: 21.2 }],
      }),
      { amount: 21.2, source: "price_64_boxes" }
    );
  });

  it("leaves machine film catalog pricing on the previous order", () => {
    assert.equal(handCatalogQuote({ application: "machine", widthInches: 20 }), null);
    assert.equal(
      getDisplayPrice({
        application: "machine",
        widthInches: 20,
        product_variants: [
          { boxes_count: 1, price: 10 },
          { boxes_count: 64, price: 21.2 },
        ],
      }),
      10
    );
    assert.equal(
      getDisplayPrice({
        application: "machine",
        width_inches: 20,
        variants: [{ rolls_count: 20, price: 696.44 }],
      }),
      null
    );
    assert.equal(
      buildHandFullPalletCartItem(
        {
          id: 20,
          slug: "genesis",
          title: "GENESIS",
          application: "machine",
          width_inches: 20,
          gauge: 60,
          length_feet: 6000,
        },
        { id: "m", boxes_count: 64, price: 21.2 }
      ),
      null
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

  it("prices a 256-roll pallet as 64 boxes", () => {
    assert.equal(normalizeHandPackageBoxes(256, 256), 64);
    assert.equal(normalizeHandPackageBoxes(64, 256), 64);
    const quote = handCartQuote({
      application: "hand",
      totalBoxes: 256,
      quantity: 1,
      unitPrice: 9356.8,
      boxUnitPrice: 36.55,
    });
    assert.equal(quote?.boxes, 64);
    assert.equal(quote?.total, 2339.2);
  });
});
