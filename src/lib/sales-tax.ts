/** Default Texas combined rate. Override with SALES_TAX_RATE or NEXT_PUBLIC_SALES_TAX_RATE (0.0825 or 8.25). */
function resolveSalesTaxRate(): number {
  const raw = Number(process.env.NEXT_PUBLIC_SALES_TAX_RATE || process.env.SALES_TAX_RATE);
  if (!Number.isFinite(raw) || raw <= 0) return 0.0825;
  return raw > 1 ? raw / 100 : raw;
}

export const US_SALES_TAX_RATE = resolveSalesTaxRate();

export function roundMoney(amount: number): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, value) * 100) / 100;
}

/** Tax applies once to the discounted merchandise amount, not to shipping. */
export function calculateSalesTax(taxableMerchandise: number): number {
  return roundMoney(roundMoney(taxableMerchandise) * US_SALES_TAX_RATE);
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  taxRate: number;
  total: number;
}

/** Total = Subtotal − discount + tax + shipping. Tax is the rate times discounted merchandise. */
export function calculateOrderTotal(input: {
  subtotal: number;
  discount?: number;
  shipping?: number;
}): CheckoutTotals {
  const subtotal = roundMoney(input.subtotal);
  const discount = roundMoney(Math.min(Math.max(0, input.discount || 0), subtotal));
  const shipping = roundMoney(input.shipping || 0);
  const taxable = roundMoney(subtotal - discount);
  const tax = calculateSalesTax(taxable);
  const total = roundMoney(taxable + tax + shipping);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    taxRate: US_SALES_TAX_RATE,
    total,
  };
}
