import { equivalentPalletCount } from "@/lib/shipping/local-delivery";
import { calculateOrderTotal, roundMoney } from "@/lib/sales-tax";
import type { SalesQuoteFreightSummary, SalesQuoteLine, SalesQuoteLineInput } from "./types";

export function priceSalesQuoteLines(items: SalesQuoteLineInput[]): SalesQuoteLine[] {
  return items
    .filter((item) => Math.floor(Number(item.quantity) || 0) > 0)
    .map((item) => {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const unitPrice = roundMoney(Number(item.unitPrice) || 0);
      return {
        ...item,
        quantity,
        unitPrice,
        lineTotal: roundMoney(unitPrice * quantity),
      };
    });
}

export function salesQuoteMerchandiseSubtotal(lines: SalesQuoteLine[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0));
}

export function salesQuoteDiscountAmount(input: {
  subtotal: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
}): number {
  const subtotal = roundMoney(Math.max(0, Number(input.subtotal) || 0));
  const percent = Math.max(0, Math.min(100, Number(input.discountPercent) || 0));
  const fromPercent = roundMoney((subtotal * percent) / 100);
  const flat = Math.max(0, Number(input.discountAmount) || 0);
  return roundMoney(Math.min(subtotal, Math.max(fromPercent, flat)));
}

export function salesQuotePalletCount(lines: SalesQuoteLine[]): number {
  let boxes = 0;
  let rolls = 0;
  for (const line of lines) {
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    if (line.application === "machine") {
      rolls += Math.max(0, Math.round(Number(line.rollsPerPackage) || 0)) * qty;
    } else {
      boxes += Math.max(0, Math.floor(Number(line.boxesPerPackage) || 0)) * qty;
      rolls += Math.max(0, Math.round(Number(line.rollsPerPackage) || 0)) * qty;
    }
  }
  return equivalentPalletCount({ boxes, rolls });
}

export function salesQuoteTotals(input: {
  lines: SalesQuoteLine[];
  discountPercent?: number | null;
  discountAmount?: number | null;
  shipping: number;
  taxExempt?: boolean;
}) {
  const subtotal = salesQuoteMerchandiseSubtotal(input.lines);
  const discount = salesQuoteDiscountAmount({
    subtotal,
    discountPercent: input.discountPercent,
    discountAmount: input.discountAmount,
  });
  const quote = calculateOrderTotal({
    subtotal,
    discount,
    shipping: input.shipping,
    taxExempt: input.taxExempt,
  });
  return {
    subtotal: quote.subtotal,
    discount,
    shipping: quote.shipping,
    tax: quote.tax,
    total: quote.total,
    palletCount: salesQuotePalletCount(input.lines),
  };
}

export function emptyFreightSummary(): SalesQuoteFreightSummary {
  return { mode: "none", label: "Shipping TBD" };
}
