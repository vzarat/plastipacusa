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
    assert.deepEqual(purchase.content_ids, ["ELT-SF154015-1B", "ELT-SF154015-64B"]);
  });

  it("maps legacy catalog codes to the unified sku before the pixel payload", () => {
    assert.equal(catalogContentId("FEL-154015-1B"), "ELT-SF154015-1B");
    assert.equal(catalogContentId("HPFSF205170-HLP"), "HPF-SF205170-HLP");
    assert.equal(catalogContentId("product-uuid"), "");
    const databaseId = "3f1c2a90-7b6e-4d11-9a2c-1b8e5d44a012";
    assert.equal(catalogContentId(databaseId), "");
    assert.equal(
      catalogContentId({
        sku: databaseId,
        title: "FORCE Elite",
        application: "hand",
        widthInches: 15,
        gauge: 40,
        lengthFeet: 1500,
        boxes: 1,
      }),
      "ELT-SF154015-1B"
    );
    const viewedFromId = viewContentParams({
      sku: databaseId,
      name: "FORCE Elite",
      price: 28.21,
      title: "FORCE Elite",
      application: "hand",
      widthInches: 15,
      gauge: 40,
      lengthFeet: 1500,
      boxes: 1,
    });
    assert.deepEqual(viewedFromId.content_ids, ["ELT-SF154015-1B"]);
    assert.equal(viewedFromId.content_type, "product");
    assert.equal(viewedFromId.content_name, "FORCE Elite");
    assert.equal(viewedFromId.currency, "USD");
    assert.equal(viewedFromId.value, 28.21);
    assert.equal(JSON.stringify(viewedFromId).includes(databaseId), false);
    const checkout = initiateCheckoutParams({
      cartSubtotal: 28.21,
      currency: "USD",
      itemsCount: 1,
      items: [
        {
          sku: databaseId,
          quantity: 1,
          price: 28.21,
          title: "FORCE Elite",
          application: "hand",
          widthInches: 15,
          gauge: 40,
          lengthFeet: 1500,
          boxes: 1,
        },
      ],
    });
    assert.deepEqual(checkout.content_ids, ["ELT-SF154015-1B"]);
    assert.equal(checkout.content_type, "product");
    const added = addToCartParams({
      sku: "FEL-154015-1BX",
      price: 28.21,
      currency: "USD",
      quantity: 2,
    });
    assert.deepEqual(added.content_ids, ["ELT-SF154015-1B"]);
    assert.equal(added.content_type, "product");
    const viewed = viewContentParams({ sku: "FST-188010-64B", price: 21.2, name: "18 inch film" });
    assert.deepEqual(viewed.content_ids, ["STD-SF188010-64B"]);
    assert.equal(viewed.content_type, "product");
    const purchase = purchaseParams({
      orderId: "PO-1002",
      total: 28.21,
      currency: "USD",
      items: [
        { sku: "FEL-154015-1B", quantity: 1, price: 28.21 },
        { sku: "not-in-catalog", quantity: 1, price: 1 },
      ],
    });
    assert.deepEqual(purchase.content_ids, ["ELT-SF154015-1B"]);
    assert.equal(purchase.num_items, 1);
  });
});
