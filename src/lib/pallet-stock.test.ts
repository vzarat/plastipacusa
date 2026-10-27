import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { customerHoldMessage } from "./payments/checkout-holds";
import {
  deductBoxesFromPalletStock,
  describePalletStock,
  fullPalletsForPackage,
  orderLinePallets,
  palletAvailabilityLabel,
  palletStockLabel,
  palletStockShortage,
  soldOutCheckoutMessage,
} from "./pallet-stock";

describe("pallet stock", () => {
  it("counts a 64-box hand line and a 40-roll machine line as full pallets", () => {
    assert.equal(
      fullPalletsForPackage({
        application: "hand",
        boxesPerPackage: 64,
        quantity: 2,
        widthInches: 15,
        gauge: 40,
        lengthFeet: 1500,
      }),
      2
    );
    assert.equal(
      fullPalletsForPackage({
        application: "hand",
        boxesPerPackage: 1,
        quantity: 4,
        widthInches: 15,
        gauge: 40,
        lengthFeet: 1500,
      }),
      0.0625
    );
    assert.equal(
      fullPalletsForPackage({ application: "machine", rollsPerPackage: 40, quantity: 3 }),
      3
    );
    assert.equal(
      fullPalletsForPackage({ application: "machine", rollsPerPackage: 20, quantity: 1 }),
      0.5
    );
    assert.equal(
      fullPalletsForPackage({
        application: "hand",
        boxesPerPackage: 24,
        quantity: 1,
        widthInches: 18,
        gauge: 80,
        lengthFeet: 1500,
      }),
      1
    );
    assert.equal(
      fullPalletsForPackage({
        application: "hand",
        boxesPerPackage: 64,
        quantity: 1,
        widthInches: 18,
        gauge: 60,
        lengthFeet: 1500,
      }),
      1
    );
    assert.equal(
      fullPalletsForPackage({
        application: "hand",
        boxesPerPackage: 16,
        quantity: 1,
        widthInches: 18,
        gauge: 60,
        lengthFeet: 1500,
      }),
      0.25
    );
  });

  it("reads a stored pallet count and ignores a loose box line", () => {
    assert.equal(orderLinePallets({ pallets: 2, boxes: 128, quantity: 2 }), 2);
    assert.equal(orderLinePallets({ pallets: 0.5, boxes: 32, quantity: 1 }), 0.5);
    assert.equal(orderLinePallets({ boxes: 32, quantity: 2 }), 0);
    assert.equal(orderLinePallets({ boxes: 128, quantity: 2 }), 2);
    assert.equal(palletAvailabilityLabel(1), "1 Pallet Available");
    assert.equal(palletAvailabilityLabel(0.5), "0.5 Pallets Available");
    assert.equal(palletAvailabilityLabel(5), "5 Pallets Available");
  });

  it("rejects a checkout that asks for more full pallets than are on hand", () => {
    const stock = new Map<string, number | null>([["film", 1]]);
    assert.equal(
      palletStockShortage(
        [
          { productId: "film", productName: "STRETCH FILM 15", pallets: 1 },
          { productId: "film", productName: "STRETCH FILM 15", pallets: 1 },
        ],
        stock
      ),
      "Only 1 full pallet is available for STRETCH FILM 15."
    );
    assert.equal(
      palletStockShortage([{ productId: "film", productName: "STRETCH FILM 15", pallets: 0 }], stock),
      null
    );
    assert.equal(
      palletStockShortage(
        [{ productId: "film", productName: "STRETCH FILM 15", pallets: 0.5 }],
        new Map([["film", 0.25]])
      ),
      "Only 0.25 pallets are available for STRETCH FILM 15."
    );
    assert.equal(
      palletStockShortage(
        [{ productId: "film", productName: "STRETCH FILM 15", pallets: 0.5, boxes: 32 }],
        new Map([["film", 0.25]])
      ),
      "Only 0 full pallets and 16 boxes are available for STRETCH FILM 15."
    );
  });

  it("breaks a full pallet into loose boxes when the customer buys cases", () => {
    assert.deepEqual(describePalletStock(2.25, 64), {
      fullPallets: 2,
      looseBoxes: 16,
      totalBoxes: 144,
    });
    assert.equal(deductBoxesFromPalletStock(1, 64, 1), 0.984375);
    assert.deepEqual(describePalletStock(0.984375, 64), {
      fullPallets: 0,
      looseBoxes: 63,
      totalBoxes: 63,
    });
    assert.equal(deductBoxesFromPalletStock(2, 64, 80), 0.75);
    assert.equal(deductBoxesFromPalletStock(0.25, 64, 32), null);
    assert.equal(deductBoxesFromPalletStock(null, 64, 4), null);
    assert.equal(deductBoxesFromPalletStock(1, null, 0, 0.5), 0.5);
    assert.equal(palletStockLabel(2.25, 64), "2 full pallets and 16 boxes");
    assert.equal(palletStockLabel(2, 64), "2 Pallets Available");
    assert.equal(
      soldOutCheckoutMessage(
        [{ productId: "film", productName: "STRETCH FILM 15" }],
        new Map([["film", { stock: 0, soldOut: false }]])
      ),
      "STRETCH FILM 15 is sold out."
    );
  });

  it("keeps a real stock rejection and ignores a database failure", () => {
    assert.equal(
      customerHoldMessage({ message: "Only 1 full pallet is available for STRETCH FILM." }),
      "Only 1 full pallet is available for STRETCH FILM."
    );
    assert.equal(
      customerHoldMessage({ message: "Only 16 boxes are available." }),
      "Only 16 boxes are available."
    );
    assert.equal(
      customerHoldMessage({
        message: 'null value in column "is_sold_out" of relation "products" violates not-null constraint',
      }),
      null
    );
  });
});
