import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateOrderTotal, profileIsTaxExempt, roundMoney, US_SALES_TAX_RATE } from "./sales-tax";

describe("checkout sales tax", () => {
  it("taxes merchandise and the shipping rate together", () => {
    const quote = calculateOrderTotal({ subtotal: 100, shipping: 20 });
    const taxable = 120;
    assert.equal(quote.subtotal, 100);
    assert.equal(quote.shipping, 20);
    assert.equal(quote.tax, roundMoney(taxable * US_SALES_TAX_RATE));
    assert.equal(quote.total, roundMoney(taxable + quote.tax));
  });

  it("charges no tax on items or shipping for a tax-exempt reseller", () => {
    const quote = calculateOrderTotal({ subtotal: 100, shipping: 20, taxExempt: true });
    assert.equal(quote.tax, 0);
    assert.equal(quote.taxRate, 0);
    assert.equal(quote.total, 120);
    assert.equal(profileIsTaxExempt({ is_tax_exempt: true }), true);
    assert.equal(profileIsTaxExempt({ tax_exempt_verified: true }), true);
    assert.equal(profileIsTaxExempt({ is_tax_exempt: false }), false);
  });
});
