import type {
  AppliedDiscount,
  ApplyDiscountResult,
  DiscountCode,
  DiscountType,
} from "@/types/discount";

const MOCK_STORAGE_KEY = "plastipac-discount-codes-mock";

/** Seed mock codes used when Supabase `discount_codes` is unavailable. */
export const MOCK_DISCOUNT_CODES: DiscountCode[] = [
  {
    id: "mock-plasti10",
    code: "PLASTI10",
    name: "10% Storewide",
    discount_type: "percent",
    discount_value: 10,
    expires_at: null,
    is_active: true,
  },
  {
    id: "mock-save25",
    code: "SAVE25",
    name: "$25 Off",
    discount_type: "fixed",
    discount_value: 25,
    expires_at: null,
    is_active: true,
  },
];

export function mapDiscountToApplied(
  raw: DiscountCode | Record<string, unknown>
): AppliedDiscount {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id),
    code: String(r.code || "").toUpperCase(),
    name: (r.name as string | null | undefined) ?? null,
    discountType: (r.discount_type || r.discountType || "percent") as DiscountType,
    discountValue: Number(r.discount_value ?? r.discountValue ?? 0),
  };
}

export function normalizeDiscountRpcPayload(payload: unknown): ApplyDiscountResult {
  if (!payload || typeof payload !== "object") {
    return { success: false, error: "Unable to validate discount code." };
  }
  const data = payload as Record<string, unknown>;
  if (data.success === false) {
    return { success: false, error: String(data.error || "Invalid discount code.") };
  }
  const discountRaw = (data.discount || data) as Record<string, unknown>;
  if (!discountRaw?.code) {
    return { success: false, error: "Invalid discount code response." };
  }
  return { success: true, discount: mapDiscountToApplied(discountRaw) };
}

/** Apply percent or fixed discount to a price. */
export function applyDiscountToPrice(
  price: number,
  discount: AppliedDiscount | null | undefined
): number {
  if (!discount || !(price > 0)) return Number(price.toFixed(2));
  if (discount.discountType === "fixed") {
    return Number(Math.max(0, price - discount.discountValue).toFixed(2));
  }
  const pct = Number(discount.discountValue) || 0;
  return Number(Math.max(0, price * (1 - pct / 100)).toFixed(2));
}

export function formatDiscountLabel(discount: AppliedDiscount): string {
  if (discount.discountType === "fixed") {
    return `$${discount.discountValue.toFixed(2)} OFF`;
  }
  return `${discount.discountValue}% OFF`;
}

export function readMockDiscountCodes(): DiscountCode[] {
  if (typeof window === "undefined") return [...MOCK_DISCOUNT_CODES];
  try {
    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(MOCK_DISCOUNT_CODES));
      return [...MOCK_DISCOUNT_CODES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DiscountCode[]) : [...MOCK_DISCOUNT_CODES];
  } catch {
    return [...MOCK_DISCOUNT_CODES];
  }
}

export function writeMockDiscountCodes(codes: DiscountCode[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // ignore quota errors
  }
}

export function validateDiscountRow(
  row: DiscountCode,
  code: string
): ApplyDiscountResult {
  const trimmed = code.trim().toUpperCase();
  if (!row || String(row.code).toUpperCase() !== trimmed) {
    return { success: false, error: "Discount code not found." };
  }
  if (!row.is_active) {
    return { success: false, error: "This discount code is inactive." };
  }
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { success: false, error: "This discount code has expired." };
  }
  return { success: true, discount: mapDiscountToApplied(row) };
}
