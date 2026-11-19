import type {
  SalesQuoteFreightSummary,
  SalesQuoteLine,
  SalesQuotePaymentTerms,
  SalesQuoteRecord,
  SalesQuoteStatus,
} from "./types";

function money(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export function mapSalesQuoteRow(row: Record<string, unknown>): SalesQuoteRecord {
  const items = Array.isArray(row.items) ? (row.items as SalesQuoteLine[]) : [];
  const freight =
    row.freight_summary && typeof row.freight_summary === "object"
      ? (row.freight_summary as SalesQuoteFreightSummary)
      : { mode: "none" as const, label: "Shipping TBD" };

  return {
    id: String(row.id),
    quoteNumber: String(row.quote_number || ""),
    token: String(row.token || ""),
    status: String(row.status || "draft") as SalesQuoteStatus,
    customerUserId: row.customer_user_id ? String(row.customer_user_id) : null,
    companyName: String(row.company_name || ""),
    contactName: String(row.contact_name || ""),
    email: String(row.email || ""),
    phone: String(row.phone || ""),
    shippingZip: String(row.shipping_zip || ""),
    shippingCity: String(row.shipping_city || ""),
    shippingState: String(row.shipping_state || ""),
    paymentTerms: (String(row.payment_terms || "prepayment") === "net_30"
      ? "net_30"
      : "prepayment") as SalesQuotePaymentTerms,
    validUntil: String(row.valid_until || ""),
    notes: row.notes != null ? String(row.notes) : null,
    items,
    subtotal: money(row.subtotal),
    discountPercent: money(row.discount_percent),
    discountAmount: money(row.discount_amount),
    shippingAmount: money(row.shipping_amount),
    shippingMethod: row.shipping_method != null ? String(row.shipping_method) : null,
    shippingQuoteId: row.shipping_quote_id != null ? String(row.shipping_quote_id) : null,
    taxAmount: money(row.tax_amount),
    total: money(row.total),
    palletCount: money(row.pallet_count),
    weightLbs: money(row.weight_lbs),
    freightSummary: freight,
    createdBy: row.created_by ? String(row.created_by) : null,
    sentAt: row.sent_at ? String(row.sent_at) : null,
    viewedAt: row.viewed_at ? String(row.viewed_at) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

export function nextQuoteNumber(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  return `PQ-${y}${m}${d}-${suffix}`;
}
