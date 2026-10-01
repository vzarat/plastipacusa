/** US sales tax applied to the checkout merchandise subtotal. */
export const US_SALES_TAX_RATE = 0.0825;

export function roundMoney(amount: number): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  return Number(Math.max(0, value).toFixed(2));
}

export function calculateSalesTax(subtotal: number): number {
  return roundMoney(roundMoney(subtotal) * US_SALES_TAX_RATE);
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  taxRate: number;
  total: number;
}

/** Total = Subtotal − discount + shipping + tax. Tax is 8.25% of the subtotal. */
export function calculateOrderTotal(input: {
  subtotal: number;
  discount?: number;
  shipping?: number;
}): CheckoutTotals {
  const subtotal = roundMoney(input.subtotal);
  const discount = roundMoney(Math.min(Math.max(0, input.discount || 0), subtotal));
  const shipping = roundMoney(input.shipping || 0);
  const tax = calculateSalesTax(subtotal);
  const total = roundMoney(subtotal - discount + shipping + tax);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    taxRate: US_SALES_TAX_RATE,
    total,
  };
}
