import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addToCartParams, metaPixelId, purchaseParams } from "./meta-pixel";

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
      addToCartParams({ sku: "ELT-SF154015-1B", price: 28.21, currency: "USD", quantity: 1 }),
      {
        content_ids: ["ELT-SF154015-1B"],
        content_type: "product",
        contents: [{ id: "ELT-SF154015-1B", quantity: 1, item_price: 28.21 }],
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
  });
});
