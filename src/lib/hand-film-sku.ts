/** Hand film SKU: [QUALITY]-SF[WIDTH][GAUGE][LENGTH/100]-[BOXES]B. Example: STD-SF187015-32B. */

export type HandFilmQuality = "STD" | "ELT" | "HPF";

const HAND_TIER_SUFFIX: Record<number, string> = {
  1: "1B",
  16: "16B",
  32: "32B",
  64: "64B",
};

export function handFilmQualityPrefix(input: {
  categorySlug?: string | null;
  series?: string | null;
  partNumber?: string | null;
  sku?: string | null;
  title?: string | null;
  name?: string | null;
}): HandFilmQuality {
  const haystack = [
    input.categorySlug,
    input.series,
    input.partNumber,
    input.sku,
    input.title,
    input.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    haystack.includes("elite") ||
    haystack.includes("fel-") ||
    haystack.includes("eltsf") ||
    /(^|[^a-z])elt([^a-z]|$)/.test(haystack)
  ) {
    return "ELT";
  }
  if (
    haystack.includes("high performance") ||
    haystack.includes("high-performance") ||
    haystack.includes("hpf-sf") ||
    haystack.includes("hpfsf")
  ) {
    return "HPF";
  }
  return "STD";
}

/** 18" x 80 GA x 1,000 ft → 188010. 18" x 70 GA x 1,500 ft → 187015. */
export function handFilmMeasurementCode(
  widthInches: number,
  gauge: number,
  lengthFeet: number
): string | null {
  const width = Math.round(widthInches);
  const filmGauge = Math.round(gauge);
  const lengthCode = Math.round(lengthFeet / 100);
  if (width <= 0 || filmGauge <= 0 || lengthCode <= 0) return null;
  return `${width}${String(filmGauge).padStart(2, "0")}${String(lengthCode).padStart(2, "0")}`;
}

export function handFilmBaseSku(input: {
  quality?: HandFilmQuality | null;
  categorySlug?: string | null;
  series?: string | null;
  partNumber?: string | null;
  sku?: string | null;
  title?: string | null;
  name?: string | null;
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
}): string | null {
  const width = Number(input.widthInches);
  const gauge = Number(input.gauge);
  const lengthFeet = Number(input.lengthFeet);
  const measurement = handFilmMeasurementCode(width, gauge, lengthFeet);
  if (!measurement) return null;
  const quality = input.quality || handFilmQualityPrefix(input);
  return `${quality}-SF${measurement}`;
}

/** Tier SKU such as STD-SF188010-1B. Returns null for machine film or an unknown box count. */
export function handFilmTierSku(
  input: Parameters<typeof handFilmBaseSku>[0] & { boxes?: number | null }
): string | null {
  const base = handFilmBaseSku(input);
  const boxes = Math.round(Number(input.boxes));
  const suffix = HAND_TIER_SUFFIX[boxes];
  if (!base || !suffix) return null;
  return `${base}-${suffix}`;
}

/**
 * Carts saved before the elite rename still send FEL-154015-1B.
 * The catalog row is ELT-SF154015-1B. Both keys are returned so checkout can find the price.
 */
export function handFilmSkuAliases(sku: string): string[] {
  const original = sku.trim();
  const text = original.toUpperCase();
  const keys = new Set<string>();
  if (original) keys.add(original);
  if (text) keys.add(text);

  const legacy = text.match(/^FEL-(\d{6})-(1|16|32|64)B$/);
  if (legacy) keys.add(`ELT-SF${legacy[1]}-${legacy[2]}B`);

  const current = text.match(/^ELT-SF(\d{6})-(1|16|32|64)B$/);
  if (current) keys.add(`FEL-${current[1]}-${current[2]}B`);

  return [...keys];
}
