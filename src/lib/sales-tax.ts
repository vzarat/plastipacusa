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

/** Tax applies to discounted merchandise plus shipping. */
export function calculateSalesTax(taxableAmount: number): number {
  return roundMoney(roundMoney(taxableAmount) * US_SALES_TAX_RATE);
}

/** A reseller or tax-exempt account flagged on the profile pays no sales tax. */
export function profileIsTaxExempt(profile: {
  is_tax_exempt?: boolean | null;
  tax_exempt_verified?: boolean | null;
} | null): boolean {
  if (!profile) return false;
  return profile.is_tax_exempt === true || profile.tax_exempt_verified === true;
}

export interface CheckoutTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  taxRate: number;
  total: number;
}

/** Total = Subtotal − discount + shipping + tax. Tax is the rate times that merchandise and shipping. */
export function calculateOrderTotal(input: {
  subtotal: number;
  discount?: number;
  shipping?: number;
  taxExempt?: boolean;
}): CheckoutTotals {
  const subtotal = roundMoney(input.subtotal);
  const discount = roundMoney(Math.min(Math.max(0, input.discount || 0), subtotal));
  const shipping = roundMoney(input.shipping || 0);
  const merchandise = roundMoney(subtotal - discount);
  const taxable = roundMoney(merchandise + shipping);
  const taxExempt = input.taxExempt === true;
  const tax = taxExempt ? 0 : calculateSalesTax(taxable);
  const total = roundMoney(merchandise + shipping + tax);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    taxRate: taxExempt ? 0 : US_SALES_TAX_RATE,
    total,
  };
}
