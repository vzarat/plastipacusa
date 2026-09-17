export type DiscountType = "percent" | "fixed";

/**
 * App-level discount row.
 * `name` mirrors `code` when the live `discount_codes` table has no `name` column.
 */
export interface DiscountCode {
  id: string;
  code: string;
  /** Display / alias of `code` (e.g. PLASTI10). */
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  expires_at: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Columns written to Supabase `public.discount_codes`.
 * Required fields are always sent; optional fields are stripped when absent from schema.
 */
export interface DiscountCodeDbPayload {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  expires_at: string | null;
  is_active: boolean;
  /** Omitted when the live table has no `name` column. */
  name?: string;
  /** Omitted — not sent on mutate unless the table exposes this column. */
  updated_at?: string;
  created_at?: string;
}

export interface AppliedDiscount {
  id: string;
  code: string;
  name?: string | null;
  discountType: DiscountType;
  discountValue: number;
}

export interface ApplyDiscountResult {
  success: boolean;
  error?: string;
  discount?: AppliedDiscount;
}

export interface DiscountFormValues {
  code: string;
  name: string;
  discount_type: DiscountType;
  discount_value: number;
  expires_at: string;
  is_active: boolean;
}
