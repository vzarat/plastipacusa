import type {
  AppliedDiscount,
  ApplyDiscountResult,
  DiscountCode,
  DiscountCodeDbPayload,
  DiscountFormValues,
  DiscountType,
} from "@/types/discount";

/** Normalize DB / RPC discount_type values to app DiscountType. */
export function normalizeDiscountType(value: unknown): DiscountType {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (raw === "fixed" || raw === "amount" || raw === "flat") return "fixed";
  // Accept both schema `percent` and colloquial `percentage`
  return "percent";
}

/** Resolve display name — aliases to `code` when DB omits `name`. */
export function resolveDiscountName(
  code: unknown,
  name?: unknown
): string {
  const resolvedCode = String(code || "")
    .trim()
    .toUpperCase();
  const resolvedName = String(name || "")
    .trim()
    .toUpperCase();
  return resolvedName || resolvedCode;
}

/** Map a Supabase row (or partial) into the app DiscountCode shape. */
export function mapDiscountCodeRow(
  raw: DiscountCode | Record<string, unknown>
): DiscountCode {
  const r = raw as Record<string, unknown>;
  const code = String(r.code || "")
    .trim()
    .toUpperCase();
  return {
    id: String(r.id || ""),
    code,
    name: resolveDiscountName(code, r.name),
    discount_type: normalizeDiscountType(r.discount_type ?? r.discountType),
    discount_value: Number(r.discount_value ?? r.discountValue ?? 0),
    expires_at: (r.expires_at as string | null | undefined) ?? null,
    is_active: Boolean(r.is_active ?? true),
    created_at: r.created_at as string | undefined,
    updated_at: r.updated_at as string | undefined,
  };
}

/**
 * Build the write payload for create/update.
 * Sets both `code` and `name` to the coupon identifier (e.g. PLASTI10).
 */
export function buildDiscountWritePayload(
  form: Pick<
    DiscountFormValues,
    "code" | "name" | "discount_type" | "discount_value" | "expires_at" | "is_active"
  >
): DiscountCodeDbPayload {
  const code = String(form.code || "")
    .trim()
    .toUpperCase();
  const name = resolveDiscountName(code, form.name || code);

  return {
    code,
    name,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value) || 0,
    expires_at: form.expires_at
      ? new Date(form.expires_at).toISOString()
      : null,
    is_active: form.is_active,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Strip `name` when the live table lacks that column
 * (PostgREST: "Could not find the 'name' column of 'discount_codes'").
 */
export function withoutOptionalNameColumn(
  payload: DiscountCodeDbPayload
): Omit<DiscountCodeDbPayload, "name"> {
  const { name: _name, ...rest } = payload;
  return rest;
}

export function isMissingNameColumnError(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("name") &&
    (lower.includes("discount_codes") || lower.includes("schema cache")) &&
    (lower.includes("could not find") || lower.includes("does not exist"))
  );
}

export function mapDiscountToApplied(
  raw: DiscountCode | Record<string, unknown>
): AppliedDiscount {
  const r = raw as Record<string, unknown>;
  const code = String(r.code || "")
    .trim()
    .toUpperCase();
  return {
    id: String(r.id),
    code,
    name: resolveDiscountName(code, r.name),
    discountType: normalizeDiscountType(r.discount_type ?? r.discountType),
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

export function formatDiscountAppliedBadge(discount: AppliedDiscount): string {
  return `${formatDiscountLabel(discount)} Applied`;
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
