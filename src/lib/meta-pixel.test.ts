import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addToCartParams,
  catalogContentId,
  initiateCheckoutParams,
  metaPixelId,
  purchaseParams,
  viewContentParams,
} from "./meta-pixel";

describe("meta pixel", () => {
  it("uses the Meta pixel id from the official snippet", () => {
    const previous = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    assert.equal(metaPixelId(), "1740638949795559");
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "not-a-pixel";
    assert.equal(metaPixelId(), "1740638949795559");
    process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
    assert.equal(metaPixelId(), "1234567890");
    if (previous === undefined) delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    else process.env.NEXT_PUBLIC_META_PIXEL_ID = previous;
  });

  it("builds the standard add-to-cart and purchase payloads", () => {
    assert.deepEqual(
      addToCartParams({ sku: "STD-SF188010-1B", price: 28.21, currency: "USD", quantity: 1, name: "18 inch film" }),
      {
        content_ids: ["STD-SF188010-1B"],
        content_type: "product",
        content_name: "18 inch film",
        contents: [{ id: "STD-SF188010-1B", quantity: 1 }],
        currency: "USD",
        value: 28.21,
      }
    );
    const purchase = purchaseParams({
      orderId: "PO-1001",
      total: 1385.01,
      currency: "USD",
      items: [
        { sku: "ELT-SF154015-1B", quantity: 1, price: 28.21 },
        { sku: "ELT-SF154015-64B", quantity: 1, price: 1356.8 },
      ],
    });
    assert.equal(purchase.order_id, "PO-1001");
    assert.equal(purchase.value, 1385.01);
    assert.equal(purchase.num_items, 2);
    assert.deepEqual(purchase.content_ids, ["ELT-SF154015-1B", "ELT-SF154015-64B"]);
  });

  it("keeps the variant sku exactly and omits a database id", () => {
    assert.equal(catalogContentId("STD-SF188010-1B"), "STD-SF188010-1B");
    assert.equal(catalogContentId("FEL-154015-1B"), "FEL-154015-1B");
    const databaseId = "3f1c2a90-7b6e-4d11-9a2c-1b8e5d44a012";
    assert.equal(catalogContentId(databaseId), "");
    const viewed = viewContentParams({ sku: "STD-SF188010-1B", price: 21.2, name: "18 inch film" });
    assert.deepEqual(viewed.content_ids, ["STD-SF188010-1B"]);
    assert.equal(viewed.content_type, "product");
    assert.equal(viewed.content_name, "18 inch film");
    assert.equal(viewed.currency, "USD");
    assert.equal(viewed.value, 21.2);
    assert.equal("contents" in viewed, false);
    const checkout = initiateCheckoutParams({
      cartSubtotal: 56.42,
      currency: "USD",
      itemsCount: 2,
      items: [
        { sku: "STD-SF188010-1B", quantity: 2, price: 28.21, name: "18 inch film" },
        { sku: databaseId, quantity: 1, price: 1 },
      ],
    });
    assert.deepEqual(checkout.content_ids, ["STD-SF188010-1B"]);
    assert.deepEqual(checkout.contents, [{ id: "STD-SF188010-1B", quantity: 2 }]);
    const purchase = purchaseParams({
      orderId: "PO-1002",
      total: 28.21,
      currency: "USD",
      items: [{ sku: "STD-SF188010-1B", quantity: 1, price: 28.21, name: "18 inch film" }],
    });
    assert.deepEqual(purchase.content_ids, ["STD-SF188010-1B"]);
    assert.deepEqual(purchase.contents, [{ id: "STD-SF188010-1B", quantity: 1 }]);
  });
});
