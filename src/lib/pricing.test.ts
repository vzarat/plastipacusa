import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HAND_CATALOG_PALLET_LABEL,
  HAND_FULL_PALLET_BOXES,
  HAND_FULL_PALLET_ROLLS,
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
    assert.equal(bracketForBoxCount(47)?.key, "box");
    assert.equal(bracketForBoxCount(48)?.key, "full");
    assert.equal(bracketForBoxCount(64)?.key, "full");
    assert.equal(bracketForBoxCount(128)?.key, "full");
  });

  it("prices a full pallet as price_64_boxes × 48", () => {
    const unit = unitBoxPriceForCount(prices, 48);
    assert.equal(unit, 21.2);
    assert.equal(totalForBoxes(unit!, 48), 1017.6);
    assert.equal(
      formatBoxPriceEquation(48, 21.2),
      "48 Boxes × $21.20/box = $1,017.60 USD"
    );
  });

  it("keeps single boxes on price_1_box", () => {
    assert.equal(totalForBoxes(unitBoxPriceForCount(prices, 10)!, 10), 331.4);
  });

  it("reprices a cart preset from live columns, including a second pallet", () => {
    const onePallet = repriceHandCartLine(
      {
        application: "hand",
        totalBoxes: 48,
        quantity: 1,
        unitPrice: 999,
        totalPrice: 999,
        boxUnitPrice: 1,
      },
      prices
    );
    assert.equal(onePallet.boxUnitPrice, 21.2);
    assert.equal(onePallet.unitPrice, 1017.6);
    assert.equal(onePallet.totalPrice, 1017.6);

    const twoPallets = repriceHandCartLine({ ...onePallet, quantity: 2 }, prices);
    assert.equal(twoPallets.boxUnitPrice, 21.2);
    assert.equal(twoPallets.totalPrice, 2035.2);
  });

  it("multiplies the variant per-box price by the box count for catalog cards", () => {
    assert.deepEqual(
      catalogPackageQuote({
        application: "hand",
        variants: [
          { boxes_count: 48, price: "21.20" },
          { boxes_count: 1, price: "30.00" },
        ],
      }),
      { boxes: 48, unitBoxPrice: 21.2, total: 1017.6 }
    );
  });

  it("reads product_variants.price as the per-box rate", () => {
    assert.equal(perBoxPriceFromVariant({ boxes_count: 48, price: 21.2 }, 48), 21.2);
    assert.equal(totalForBoxes(perBoxPriceFromVariant({ price: 21.2 }, 48)!, 48), 1017.6);
    assert.deepEqual(
      catalogPackageQuote({
        application: "hand",
        variants: [{ boxes_count: 48, price: 21.2 }],
      }),
      { boxes: 48, unitBoxPrice: 21.2, total: 1017.6 }
    );
  });

  it("prices the hand catalog from the 48-box full pallet variant", () => {
    const film15 = {
      application: "hand",
      product_variants: [
        { boxes_count: 1, price: 28.21 },
        { boxes_count: 48, price: 21.2 },
      ],
    };
    assert.equal(handCatalogUnitPrice(film15), 21.2);
    assert.equal(getDisplayPrice(film15), 21.2);
    assert.equal(
      handCatalogUnitPrice({
        application: "hand",
        variants: [
          { boxes_count: 1, price: 40 },
          { boxes_count: 48, price: 32.71 },
        ],
      }),
      32.71
    );
    assert.equal(
      handCatalogQuote({
        application: "hand",
        variants: [{ boxes_count: 48, price: 30.79 }, { boxes_count: 1, price: 36 }],
      })?.pricePerBox,
      30.79
    );
    assert.equal(HAND_CATALOG_PALLET_LABEL, "Full pallet · 48 boxes · 192 rolls");
    assert.equal(HAND_FULL_PALLET_BOXES, 48);
    assert.equal(HAND_FULL_PALLET_ROLLS, 192);
    const pallet = quoteTierPrice(21.2, 48, 1);
    assert.equal(pallet.pricePerBox, 21.2);
    assert.equal(pallet.total, 1017.6);
    const pricesFromVariants = boxTierPricesFromVariants(film15.product_variants);
    const line = repriceHandCartLine(
      {
        application: "hand",
        totalBoxes: 48,
        quantity: 1,
        unitPrice: 1,
        totalPrice: 1,
        boxUnitPrice: 0,
      },
      pricesFromVariants
    );
    assert.equal(line.boxUnitPrice, 21.2);
    assert.equal(line.unitPrice, 1017.6);
    assert.equal(line.totalPrice, 1017.6);
    assert.equal(
      preferredHandTier([
        { tierKey: "box", boxes: 1 },
        { tierKey: "full", boxes: 48 },
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
    const variant48 = {
      id: "v48",
      sku: "F1560-48",
      boxes_count: 48,
      price: 21.2,
      pallet_weight_lbs: 420,
    };
    const cartLine = buildHandFullPalletCartItem(product, variant48);
    assert.equal(cartLine?.rollsPerBox, 4);
    assert.equal(cartLine?.totalBoxes, 48);
    assert.equal(cartLine?.totalRolls, 192);
    assert.equal(cartLine?.quantity, 1);
    assert.equal(cartLine?.boxUnitPrice, 21.2);
    assert.equal(cartLine?.unitPrice, 1017.6);
    assert.equal(cartLine?.weightLbs, "420.00");
    assert.equal(buildHandFullPalletCartItem({ ...product, width_inches: null }, variant48), null);
    assert.equal(buildHandFullPalletCartItem(product, null), null);
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
        product_variants: [{ boxes_count: 1, price: 0 }, { boxes_count: 48, price: 21.2 }],
      }),
      21.2
    );
    assert.equal(getDisplayPrice({ application: "hand", price_1_box: "33.14" }), null);
    assert.equal(getDisplayPrice({ application: "hand", product_variants: [{ boxes_count: 1, price: 0 }] }), null);
  });

  it("uses the 48-box variant price on hand catalog cards", () => {
    assert.deepEqual(
      catalogCardStartingPrice({
        application: "hand",
        variants: [{ price: 0 }, { boxes_count: 48, price: 21.2 }],
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
  });

  it("leaves machine film catalog pricing on the previous order", () => {
    assert.equal(handCatalogQuote({ application: "machine", widthInches: 20 }), null);
    assert.equal(
      getDisplayPrice({
        application: "machine",
        widthInches: 20,
        product_variants: [
          { boxes_count: 1, price: 10 },
          { boxes_count: 48, price: 21.2 },
        ],
      }),
      10
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
        { id: "m", boxes_count: 48, price: 21.2 }
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
    assert.equal(unitBoxPriceForCount(partial, 48), null);
    const line = repriceHandCartLine(
      {
        application: "hand",
        totalBoxes: 1,
        quantity: 1,
        unitPrice: 40,
        totalPrice: 40,
      },
      partial
    );
    assert.equal(line.unitPrice, 40);
    assert.equal(line.totalPrice, 40);
  });

  it("prices a 192-roll pallet as 48 boxes", () => {
    assert.equal(normalizeHandPackageBoxes(192, 192), 48);
    assert.equal(normalizeHandPackageBoxes(48, 192), 48);
    const quote = handCartQuote({
      application: "hand",
      totalBoxes: 48,
      quantity: 1,
      unitPrice: 1017.6,
      boxUnitPrice: 21.2,
    });
    assert.equal(quote?.boxes, 48);
    assert.equal(quote?.total, 1017.6);
  });
});
