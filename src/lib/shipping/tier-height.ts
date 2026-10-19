import { HAND_FREIGHT_DIMENSIONS_IN, machineHandlingUnit } from "@/lib/shipping/hand-freight";

/**
 * Change these numbers to change every quote.
 * Footprint is 48 x 48 in for every product.
 * Tier height = PALLET_BASE_HEIGHT_IN + (full height - base) × fraction.
 * Fractions: full 1, half 1/2, layer 1/4. Base stays 0 until the pallet deck is measured.
 * Loose boxes follow LOOSE_BOX_MODE.
 */
export const PALLET_BASE_HEIGHT_IN = 0;

/** "pallet": 1–15 boxes are one 48×48 piece at layer height. "carton": each box uses the specs-table box size. */
export const LOOSE_BOX_MODE = "pallet" as "pallet" | "carton";

export const TIER_HEIGHT = {
  footprintLengthIn: 48,
  footprintWidthIn: 48,
  /** Full-pallet height the hand-film specs table shows when products.pallet_dimensions has no height. */
  shownHandFullPalletHeightIn: 78,
  halfOfFull: 1 / 2,
  layerOfFull: 1 / 4,
} as const;

/** Single-box size shown on the product specs table (11 x 11 x 19.5). */
export const SPECS_BOX_INCHES = HAND_FREIGHT_DIMENSIONS_IN.loose;

export interface FullPalletHeight {
  heightIn: number;
  source: "pallet_dimensions" | "shown_hand_specs" | "shown_machine_specs";
}

export interface TierInches {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  /** True when a loose box used the quarter-height rule because the product has no box inches. */
  looseScaled: boolean;
}

function positive(value: unknown): number | null {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function roundInches(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** base + (full height - base) × fraction. Base is PALLET_BASE_HEIGHT_IN. */
export function heightFromFullPallet(fullHeightIn: number, fraction: number): number | null {
  const full = positive(fullHeightIn);
  if (!full) return null;
  const base = PALLET_BASE_HEIGHT_IN;
  const height = base + (full - base) * fraction;
  if (!(height > 0)) return null;
  return roundInches(height);
}

/** Third number of "L x W x H", or a bare height. */
export function heightFromPalletDimensions(value: unknown): number | null {
  const text = String(value || "");
  const triple = text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (triple) return positive(triple[3]);
  return null;
}

export function resolveFullPalletHeight(input: {
  palletDimensions?: string | null;
  palletHeightIn?: number | null;
  application?: string | null;
  widthInches?: number | null;
}): FullPalletHeight | null {
  const stored = heightFromPalletDimensions(input.palletDimensions) ?? positive(input.palletHeightIn);
  if (stored) return { heightIn: stored, source: "pallet_dimensions" };
  if (String(input.application || "").toLowerCase() === "machine") {
    const width = positive(input.widthInches);
    if (!width) return null;
    return {
      heightIn: machineHandlingUnit(40, width).heightIn,
      source: "shown_machine_specs",
    };
  }
  return { heightIn: TIER_HEIGHT.shownHandFullPalletHeightIn, source: "shown_hand_specs" };
}

export function tierInchesFromFullHeight(input: {
  fullHeightIn: number;
  tier: "full" | "half" | "layer" | "loose" | "box";
  looseBoxes?: number;
  box?: { lengthIn: number | null; widthIn: number | null; heightIn: number | null } | null;
}): TierInches | null {
  const full = positive(input.fullHeightIn);
  if (!full) return null;
  const lengthIn = TIER_HEIGHT.footprintLengthIn;
  const widthIn = TIER_HEIGHT.footprintWidthIn;
  if (input.tier === "full") {
    const heightIn = heightFromFullPallet(full, 1);
    return heightIn ? { lengthIn, widthIn, heightIn, looseScaled: false } : null;
  }
  if (input.tier === "half") {
    const heightIn = heightFromFullPallet(full, TIER_HEIGHT.halfOfFull);
    return heightIn ? { lengthIn, widthIn, heightIn, looseScaled: false } : null;
  }
  if (input.tier === "layer") {
    const heightIn = heightFromFullPallet(full, TIER_HEIGHT.layerOfFull);
    return heightIn ? { lengthIn, widthIn, heightIn, looseScaled: false } : null;
  }
  const looseTier = input.tier === "box" || input.tier === "loose";
  if (!looseTier) return null;
  if (LOOSE_BOX_MODE === "carton") {
    return {
      lengthIn: SPECS_BOX_INCHES.lengthIn,
      widthIn: SPECS_BOX_INCHES.widthIn,
      heightIn: SPECS_BOX_INCHES.heightIn,
      looseScaled: false,
    };
  }
  const heightIn = heightFromFullPallet(full, TIER_HEIGHT.layerOfFull);
  if (!heightIn) return null;
  return { lengthIn, widthIn, heightIn, looseScaled: false };
}
