import type {
  AppliedDiscount,
  ApplyDiscountResult,
  DiscountCode,
  DiscountCodeDbPayload,
  DiscountFormValues,
  DiscountType,
} from "@/types/discount";

/** Normalize DB / form / label text to check-constraint values: percentage | fixed. */
export function normalizeDiscountType(value: unknown): DiscountType {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw.includes("percent")) return "percentage";
  if (raw === "fixed" || raw === "amount" || raw === "flat" || raw.includes("fixed")) {
    return "fixed";
  }
  // Default to percentage for empty / unknown (safer for % OFF codes)
  return "percentage";
}

/** True when discount is percentage-based (legacy `percent` rows included). */
export function isPercentageDiscount(
  discount: Pick<AppliedDiscount, "discountType"> | DiscountType | null | undefined
): boolean {
  if (!discount) return false;
  const type =
    typeof discount === "string" ? discount : discount.discountType;
  return normalizeDiscountType(type) === "percentage";
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
 * Does not include `updated_at` / `created_at` — those are optional DB columns
 * and must not be sent unless confirmed present in the schema cache.
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

  return sanitizeDiscountWritePayload({
    code,
    name,
    discount_type: normalizeDiscountType(form.discount_type),
    discount_value: Number(form.discount_value) || 0,
    expires_at: form.expires_at
      ? new Date(form.expires_at).toISOString()
      : null,
    is_active: form.is_active,
  });
}

const OPTIONAL_TIMESTAMP_KEYS = ["updated_at", "created_at"] as const;
const OPTIONAL_COLUMN_KEYS = ["name", ...OPTIONAL_TIMESTAMP_KEYS] as const;

/**
 * Strip undefined / null / empty optional fields before Supabase mutate calls.
 * Timestamp columns are omitted entirely so PostgREST won't reject missing schema.
 */
export function sanitizeDiscountWritePayload(
  payload: DiscountCodeDbPayload
): DiscountCodeDbPayload {
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    if (
      OPTIONAL_TIMESTAMP_KEYS.includes(
        key as (typeof OPTIONAL_TIMESTAMP_KEYS)[number]
      )
    ) {
      // Never send client-generated timestamps unless explicitly required later.
      continue;
    }
    if (typeof value === "string" && value.trim() === "" && key !== "code") {
      continue;
    }
    if (key === "discount_type") {
      // Enforce check constraint: percentage | fixed (never labels like "Percentage (%)")
      next[key] = normalizeDiscountType(value);
      continue;
    }
    next[key] = value;
  }

  // Guarantee discount_type is always a valid constraint value
  if (!next.discount_type) {
    next.discount_type = normalizeDiscountType(payload.discount_type);
  }

  return next as unknown as DiscountCodeDbPayload;
}

/** Remove known optional columns that may be absent from the live schema. */
export function stripOptionalDiscountColumns(
  payload: DiscountCodeDbPayload,
  columns: readonly string[] = OPTIONAL_COLUMN_KEYS
): DiscountCodeDbPayload {
  const next: Record<string, unknown> = { ...payload };
  for (const key of columns) {
    delete next[key];
  }
  return sanitizeDiscountWritePayload(next as unknown as DiscountCodeDbPayload);
}

/**
 * @deprecated Prefer stripOptionalDiscountColumns — kept for call-site compatibility.
 */
export function withoutOptionalNameColumn(
  payload: DiscountCodeDbPayload
): DiscountCodeDbPayload {
  return stripOptionalDiscountColumns(payload, ["name"]);
}

export function isPostgrestSchemaCacheError(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    (lower.includes("could not find") || lower.includes("does not exist")) &&
    (lower.includes("schema cache") ||
      lower.includes("column") ||
      lower.includes("discount_codes"))
  );
}

export function isMissingNameColumnError(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("name") &&
    isPostgrestSchemaCacheError(message)
  );
}

export function isMissingUpdatedAtColumnError(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("updated_at") && isPostgrestSchemaCacheError(message);
}

/** Friendly toast copy for PostgREST schema-cache mismatches. */
export function formatDiscountSchemaError(message?: string | null): string {
  if (!message) return "Could not save discount.";
  if (isMissingUpdatedAtColumnError(message)) {
    return "discount_codes is missing updated_at — retrying without timestamps.";
  }
  if (isMissingNameColumnError(message)) {
    return "discount_codes is missing name — retrying without that column.";
  }
  if (isPostgrestSchemaCacheError(message)) {
    return `Supabase schema mismatch: ${message}`;
  }
  return message;
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
  if (normalizeDiscountType(discount.discountType) === "fixed") {
    return Number(Math.max(0, price - discount.discountValue).toFixed(2));
  }
  const pct = Number(discount.discountValue) || 0;
  return Number(Math.max(0, price * (1 - pct / 100)).toFixed(2));
}

export function formatDiscountLabel(discount: AppliedDiscount): string {
  if (normalizeDiscountType(discount.discountType) === "fixed") {
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
