import type { CartItem } from "@/types";
import type { AppliedCoupon, ApplyCouponResult, Coupon } from "@/types/coupon";

function normalizeWidth(value: unknown): number | null {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function itemMatchesCoupon(item: CartItem, coupon: AppliedCoupon): boolean {
  switch (coupon.targetType) {
    case "global":
      return true;
    case "width": {
      const target = normalizeWidth(coupon.targetValue);
      const itemWidth = normalizeWidth(item.widthInches);
      return target !== null && itemWidth !== null && target === itemWidth;
    }
    case "gauge": {
      const target = Number(coupon.targetValue);
      return Number.isFinite(target) && Number(item.gauge) === target;
    }
    case "category": {
      const target = String(coupon.targetValue || "").toLowerCase();
      return String(item.application || "").toLowerCase() === target;
    }
    default:
      return false;
  }
}

/** Discount amount for a single cart line. */
export function getItemDiscountAmount(item: CartItem, coupon: AppliedCoupon | null): number {
  if (!coupon) return 0;
  if (!itemMatchesCoupon(item, coupon)) return 0;
  const pct = Number(coupon.discountPercent) || 0;
  if (pct <= 0) return 0;
  return Number(((item.totalPrice * pct) / 100).toFixed(2));
}

/** Total discount across cart for the active coupon. */
export function getCartDiscountAmount(
  items: CartItem[],
  coupon: AppliedCoupon | null
): number {
  if (!coupon || !items.length) return 0;
  const total = items.reduce(
    (sum, item) => sum + getItemDiscountAmount(item, coupon),
    0
  );
  return Number(total.toFixed(2));
}

export function mapCouponToApplied(raw: Coupon | Record<string, unknown>): AppliedCoupon {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id),
    code: String(r.code || "").toUpperCase(),
    discountPercent: Number(r.discount_percent ?? r.discountPercent ?? 0),
    targetType: (r.target_type || r.targetType || "global") as AppliedCoupon["targetType"],
    targetValue:
      r.target_value === null || r.target_value === undefined
        ? null
        : String(r.target_value ?? r.targetValue ?? ""),
  };
}

export function normalizeRpcCouponPayload(payload: unknown): ApplyCouponResult {
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "Unable to validate promo code." };
  }

  const data = payload as Record<string, unknown>;
  if (data.success === false) {
    return { success: false, error: String(data.error || "Invalid promo code.") };
  }

  const couponRaw = (data.coupon || data) as Record<string, unknown>;
  if (!couponRaw?.code && !couponRaw?.discount_percent) {
    return { success: false, error: "Invalid promo code response." };
  }

  return {
    success: true,
    coupon: mapCouponToApplied(couponRaw),
  };
}
