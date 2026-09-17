export type DiscountType = "percent" | "fixed";

export interface DiscountCode {
  id: string;
  code: string;
  name: string | null;
  discount_type: DiscountType;
  discount_value: number;
  expires_at: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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
