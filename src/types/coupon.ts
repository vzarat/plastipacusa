export type CouponTargetType = "global" | "width" | "gauge" | "category";

export interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  target_type: CouponTargetType;
  target_value: string | null;
  bound_email: string | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  discountPercent: number;
  targetType: CouponTargetType;
  targetValue: string | null;
}

export interface ApplyCouponResult {
  success: boolean;
  error?: string;
  coupon?: AppliedCoupon;
}

export interface CouponFormValues {
  code: string;
  discount_percent: number;
  target_type: CouponTargetType;
  target_value: string;
  bound_email: string;
  max_uses: string;
  expires_at: string;
  is_active: boolean;
}
