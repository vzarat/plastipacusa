import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filmSpecLabel, purchaseEmailFromOrder } from "./order-purchase-email";

describe("purchase order email details", () => {
  it("lists the catalog sku, film size, and package count", () => {
    assert.equal(
      filmSpecLabel({
        widthInches: 18,
        gauge: 80,
        lengthFeet: 1500,
        boxes: 64,
      }),
      '18" × 80 Ga × 1500 ft · 64 boxes'
    );
  });

  it("breaks out the carrier, shipment size, and charges", () => {
    const details = purchaseEmailFromOrder({
      subtotal: 1356.8,
      discount_amount: 0,
      shipping: 48.65,
      tax: 0,
      shipping_method: "XPO",
      shipping_service: "ECONOMY",
      shipping_transit_days: 3,
      shipping_address: {
        carrier_name: "XPO",
        carrier_key: "xpo",
        shipment_weight_lbs: 1173.5,
        shipment_pieces: [
          {
            dimensions: '48" W x 48" L x 66.0" H',
            weight: "1,173.5 lb",
            quantity: 1,
            packaging: "pallet",
          },
        ],
      },
      items: [
        {
          sku: "ELT-SF188015-64B",
          productName: 'FORCE Hand Film 18" × 80 Ga',
          quantity: 1,
          unitPrice: 1356.8,
          totalPrice: 1356.8,
          widthInches: 18,
          gauge: 80,
          lengthFeet: 1500,
          boxes: 64,
        },
      ],
    });

    assert.match(details.lineItems[0]?.description || "", /ELT-SF188015-64B/);
    assert.equal(details.lineItems[0]?.detail, '18" × 80 Ga × 1500 ft · 64 boxes');
    assert.equal(details.shippingSelection?.price, 48.65);
    assert.match(details.shippingSelection?.logoUrl || "", /XPO/);
    assert.equal(details.shippingSelection?.pieces[0]?.dimensions, '48" W x 48" L x 66.0" H');
    assert.match(details.detailsText, /Shipping price: \$48\.65/);
    assert.match(
      details.detailsText,
      /2–3 business days to prepare, then 3 business days in transit/
    );
    assert.match(details.detailsText, /1,173\.5 lb/);
  });
});
