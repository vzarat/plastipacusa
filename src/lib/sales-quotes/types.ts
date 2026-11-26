export type SalesQuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "expired"
  | "cancelled";

export type SalesQuotePaymentTerms = "prepayment" | "net_30";

export type SalesQuoteTierKey = "box" | "half" | "full";

export interface SalesQuoteLineInput {
  productId: string;
  productSlug: string;
  productName: string;
  application: "hand" | "machine";
  sku: string;
  tierKey: SalesQuoteTierKey;
  tierLabel: string;
  widthInches: string;
  gauge: number;
  lengthFeet: number;
  quantity: number;
  /** Boxes per package (hand) or 0 (machine). */
  boxesPerPackage: number;
  /** Rolls per package. */
  rollsPerPackage: number;
  unitPrice: number;
  boxUnitPrice?: number | null;
  weightLbs?: number | null;
  productImage?: string;
}

export interface SalesQuoteLine extends SalesQuoteLineInput {
  lineTotal: number;
}

export type SalesQuoteFreightMode =
  | "free_local"
  | "warp_ltl"
  | "manual"
  | "customer_arranged"
  | "none";

/** Who books the truck for this quote sheet. */
export type SalesQuoteFreightArrangement = "plastipac" | "customer";

export interface SalesQuoteFreightSummary {
  mode: SalesQuoteFreightMode;
  label: string;
  carrierName?: string | null;
  transitDays?: number | null;
  quoteId?: string | null;
  /** Warp (or manual) market rate shown when customer arranges freight. */
  suggestedAmount?: number | null;
  suggestedLabel?: string | null;
  pieces?: Array<{
    packaging: string;
    quantity: number;
    weightLbs: number;
    dimensionLabel?: string;
  }>;
}

export interface SalesQuoteRecord {
  id: string;
  quoteNumber: string;
  token: string;
  status: SalesQuoteStatus;
  customerUserId: string | null;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  shippingZip: string;
  shippingCity: string;
  shippingState: string;
  paymentTerms: SalesQuotePaymentTerms;
  validUntil: string;
  notes: string | null;
  items: SalesQuoteLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  shippingAmount: number;
  shippingMethod: string | null;
  shippingQuoteId: string | null;
  taxAmount: number;
  total: number;
  palletCount: number;
  weightLbs: number;
  freightSummary: SalesQuoteFreightSummary;
  createdBy: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesQuoteDraftInput {
  customerUserId?: string | null;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  shippingZip?: string;
  shippingCity?: string;
  shippingState?: string;
  paymentTerms: SalesQuotePaymentTerms;
  validUntil: string;
  notes?: string;
  items: SalesQuoteLineInput[];
  discountPercent?: number;
  discountAmount?: number;
  /** When set, skip Warp and use this shipping amount (admin override). */
  shippingAmountOverride?: number | null;
  shippingMethodOverride?: string | null;
  /**
   * plastipac = we book freight (default).
   * customer = freight not by us; quote still shows a Warp-suggested LTL rate.
   */
  freightArrangement?: SalesQuoteFreightArrangement;
  taxExempt?: boolean;
}
