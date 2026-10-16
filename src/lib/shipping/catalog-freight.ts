import { resolveFullPalletHeight } from "@/lib/shipping/tier-height";
import type { ShippingQuoteLine } from "@/lib/shipping/types";

/**
 * Assumption: lines with the same sku are one shipment and may be packed into that
 * product's own tiers. Different skus are never stacked on one pallet. The catalog
 * has no field that says two products can share a pallet.
 */
export function groupLinesBySku(lines: ShippingQuoteLine[]): ShippingQuoteLine[] {
  const grouped = new Map<string, ShippingQuoteLine>();
  for (const line of lines) {
    const sku = String(line.sku || "").trim();
    const slug = String(line.productSlug || "").trim();
    const key = sku || slug;
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, { ...line, quantity: Math.max(1, Math.round(Number(line.quantity) || 1)) });
      continue;
    }
    current.quantity += Math.max(1, Math.round(Number(line.quantity) || 1));
  }
  return [...grouped.values()];
}

export type CatalogTier = "box" | "layer" | "half" | "full";

export interface TierInches {
  lengthIn: number | null;
  widthIn: number | null;
  heightIn: number | null;
}

export interface CatalogDimensionSource {
  pallet_length_in?: number | null;
  pallet_width_in?: number | null;
  pallet_height_in?: number | null;
  pallet_dimensions?: string | null;
  box_length_in?: number | null;
  box_width_in?: number | null;
  box_height_in?: number | null;
  layer_length_in?: number | null;
  layer_width_in?: number | null;
  layer_height_in?: number | null;
  half_pallet_length_in?: number | null;
  half_pallet_width_in?: number | null;
  half_pallet_height_in?: number | null;
}

const TIER_FIELDS: Record<CatalogTier, [string, string, string]> = {
  box: ["box_length_in", "box_width_in", "box_height_in"],
  layer: ["layer_length_in", "layer_width_in", "layer_height_in"],
  half: ["half_pallet_length_in", "half_pallet_width_in", "half_pallet_height_in"],
  full: ["pallet_length_in", "pallet_width_in", "pallet_height_in"],
};

function numberOrNull(value: unknown): number | null {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function parsePalletText(value: unknown): { lengthIn: number; widthIn: number; heightIn: number } | null {
  const match = String(value || "").match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
  );
  if (!match) return null;
  const lengthIn = Number(match[1]);
  const widthIn = Number(match[2]);
  const heightIn = Number(match[3]);
  if (lengthIn <= 0 || widthIn <= 0 || heightIn <= 0) return null;
  return { lengthIn, widthIn, heightIn };
}

export function tierDimensionFields(tier: CatalogTier): string[] {
  return [...TIER_FIELDS[tier]];
}

/** Inches stored for this tier. Full pallet may also use products.pallet_dimensions. Other tiers have no fallback. */
export function readTierInches(
  source: CatalogDimensionSource,
  tier: CatalogTier
): { lengthIn: number; widthIn: number; heightIn: number } | null {
  const [lengthKey, widthKey, heightKey] = TIER_FIELDS[tier];
  const record = source as unknown as Record<string, unknown>;
  const lengthIn = numberOrNull(record[lengthKey]);
  const widthIn = numberOrNull(record[widthKey]);
  const heightIn = numberOrNull(record[heightKey]);
  if (lengthIn && widthIn && heightIn) return { lengthIn, widthIn, heightIn };
  if (tier === "full") return parsePalletText(source.pallet_dimensions);
  return null;
}

export interface CatalogAuditRow {
  product: string;
  application: string;
  tier: string;
  weight: "present" | "missing";
  boxesOrRolls: string;
  dimensions: "present" | "missing";
  fieldsToFill: string;
}

export interface CatalogAuditProduct {
  name: string;
  slug: string;
  application: string;
  boxWeightLbs: number | null;
  palletWeightLbs: number | null;
  boxesCount: number | null;
  rollsCount: number | null;
  widthInches?: number | null;
  dimensions: CatalogDimensionSource;
}

export function auditCatalogProduct(product: CatalogAuditProduct): CatalogAuditRow[] {
  const machine = product.application === "machine";
  const tiers: Array<{ tier: string; boxesOrRolls: string; weight: boolean; dimTier: CatalogTier }> = machine
    ? [
        { tier: "half pallet (20 rolls)", boxesOrRolls: "20 rolls", weight: product.palletWeightLbs != null, dimTier: "half" },
        { tier: "full pallet (40 rolls)", boxesOrRolls: "40 rolls", weight: product.palletWeightLbs != null, dimTier: "full" },
      ]
    : [
        { tier: "box", boxesOrRolls: "1 box", weight: product.boxWeightLbs != null, dimTier: "box" },
        { tier: "layer", boxesOrRolls: "16 boxes", weight: product.palletWeightLbs != null && product.boxWeightLbs != null, dimTier: "layer" },
        { tier: "half pallet", boxesOrRolls: "32 boxes", weight: product.palletWeightLbs != null, dimTier: "half" },
        { tier: "full pallet", boxesOrRolls: "64 boxes", weight: product.palletWeightLbs != null, dimTier: "full" },
      ];
  const height = resolveFullPalletHeight({
    palletDimensions: product.dimensions.pallet_dimensions,
    palletHeightIn: product.dimensions.pallet_height_in,
    application: product.application,
    widthInches: product.widthInches,
  });
  return tiers.map((item) => {
    return {
      product: product.name || product.slug,
      application: product.application || "unknown",
      tier: item.tier,
      weight: item.weight ? "present" : "missing",
      boxesOrRolls: item.boxesOrRolls,
      dimensions: height ? "present" : "missing",
      fieldsToFill: [
        item.weight ? "" : machine ? "product_variants.pallet_weight_lbs and products.pallet_weight_lbs" : item.dimTier === "box" ? "product_variants.box_weight_lbs" : "product_variants.pallet_weight_lbs and product_variants.box_weight_lbs",
        height ? "" : "products.pallet_dimensions (LENGTH x WIDTH x HEIGHT) or width_inches for machine film",
      ]
        .filter(Boolean)
        .join("; "),
    };
  });
}

export function handTierName(tier: "full" | "half" | "layer" | "loose"): CatalogTier {
  if (tier === "full") return "full";
  if (tier === "half") return "half";
  if (tier === "layer") return "layer";
  return "box";
}
