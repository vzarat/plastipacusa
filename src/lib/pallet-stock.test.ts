import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fullPalletsForPackage,
  orderLinePallets,
  palletAvailabilityLabel,
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
      0
    );
    assert.equal(
      fullPalletsForPackage({ application: "machine", rollsPerPackage: 40, quantity: 3 }),
      3
    );
    assert.equal(
      fullPalletsForPackage({ application: "machine", rollsPerPackage: 20, quantity: 1 }),
      0
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
  });

  it("reads a stored pallet count and ignores a loose box line", () => {
    assert.equal(orderLinePallets({ pallets: 2, boxes: 128, quantity: 2 }), 2);
    assert.equal(orderLinePallets({ boxes: 32, quantity: 2 }), 0);
    assert.equal(orderLinePallets({ boxes: 128, quantity: 2 }), 2);
    assert.equal(palletAvailabilityLabel(1), "1 Pallet Available");
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
      soldOutCheckoutMessage(
        [{ productId: "film", productName: "STRETCH FILM 15" }],
        new Map([["film", { stock: 0, soldOut: false }]])
      ),
      "STRETCH FILM 15 is sold out."
    );
  });
});
