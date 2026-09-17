/**
 * Warehouse palletizing specs by film width / gauge / length families.
 * Source of truth for storefront "Palletizing & Shipping Specs" and seed defaults.
 */

export interface PalletizingSpecs {
  fullPalletRolls: number;
  palletLayers: number;
  rollsPerLayer: number;
  rollsPerBox: number;
  boxesPerFullPallet: number;
  /** Human-readable pack-out summary for UI */
  packOutSummary: string;
  familyLabel: string;
}

export interface PalletizingInput {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  application?: string | null;
  slug?: string | null;
  name?: string | null;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

function resolveWidth(input: PalletizingInput): number {
  const explicit = Math.round(toNumber(input.widthInches));
  if (explicit > 0) return explicit;

  const haystack = `${input.slug || ""} ${input.name || ""}`.toLowerCase();
  if (haystack.includes("20") || haystack.includes('20"')) return 20;
  if (haystack.includes("15") || haystack.includes('15"')) return 15;
  if (haystack.includes("18") || haystack.includes('18"')) return 18;
  if (String(input.application || "").toLowerCase() === "machine") return 20;
  return 18;
}

/** 15" × 80 GA variants are excluded from the active catalog when flagged. */
export function isExcludedFifteenInchEightyGauge(input: PalletizingInput): boolean {
  const width = resolveWidth(input);
  const gauge = Math.round(toNumber(input.gauge));
  return width === 15 && gauge === 80;
}

/**
 * Resolve palletizing metadata for a product / variant.
 */
export function resolvePalletizingSpecs(input: PalletizingInput): PalletizingSpecs {
  const width = resolveWidth(input);
  const gauge = Math.round(toNumber(input.gauge));
  const length = Math.round(toNumber(input.lengthFeet));
  const application = String(input.application || "").toLowerCase();
  const haystack = `${input.slug || ""} ${input.name || ""}`.toLowerCase();
  const isMachine =
    width === 20 ||
    application === "machine" ||
    haystack.includes("machine") ||
    haystack.includes("automatic") ||
    haystack.includes("genesis");

  // 20" Automatic Machine Films
  // 51 GA @ 7000/9000 FT, 70 GA & 80 GA @ 5000 FT
  if (isMachine || width === 20) {
    return {
      fullPalletRolls: 40,
      palletLayers: 2,
      rollsPerLayer: 20,
      rollsPerBox: 1,
      boxesPerFullPallet: 40,
      packOutSummary: "40 rolls / full pallet · 2 layers × 20 rolls",
      familyLabel: '20" Automatic Machine Film',
    };
  }

  // 15" Width Films — 60 GA & 70 GA @ 1500 FT (80 GA excluded)
  if (width === 15) {
    return {
      fullPalletRolls: 256,
      palletLayers: 4,
      rollsPerLayer: 64,
      rollsPerBox: 4,
      boxesPerFullPallet: 64,
      packOutSummary: "256 rolls / full pallet · 4 layers × 64 rolls · 4 rolls/box",
      familyLabel: '15" Hand Stretch Film',
    };
  }

  // 18" Width Films — 60/70/80 GA @ 1000 FT & 1500 FT
  // Default / FORCE standard hand film
  return {
    fullPalletRolls: 192,
    palletLayers: 3,
    rollsPerLayer: 64,
    rollsPerBox: 4,
    boxesPerFullPallet: 48,
    packOutSummary: "192 rolls / full pallet · 3 layers × 64 rolls · 4 rolls/box (48 boxes)",
    familyLabel: '18" Hand Stretch Film',
  };
}

/** Full-pallet package label derived from warehouse pack-out. */
export function fullPalletPackageLabel(specs: PalletizingSpecs): string {
  if (specs.fullPalletRolls === 40) {
    return `FULL PALLET = ${specs.fullPalletRolls} ROLLS`;
  }
  return `${specs.boxesPerFullPallet} BOXES = ${specs.fullPalletRolls} ROLLS (FULL PALLET)`;
}
