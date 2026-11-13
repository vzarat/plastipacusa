import type { AssistantResult, FilmKind, PackageTier } from "@/lib/assistant/types";
import { HOUSTON_FREE_DELIVERY_BOXES } from "@/lib/shippingRules";

/** Legacy alias kept for imports; 1-box qty now follows MAX_PACKAGE_QUANTITY. */
export const HAND_BOX_MAX_QUANTITY = 40;
export const MAX_PACKAGE_QUANTITY = 40;
export const CATALOG_GAUGES = [40, 51, 60, 70, 80] as const;
export const MIN_LENGTH_FEET = 500;
export const MAX_LENGTH_FEET = 12000;

/** Storefront hand-film ladder. Strict 2-tier: 1 Box + Full Pallet (48×192). */
export const HAND_PACKAGE_LADDER = {
  box: { boxes: 1, rolls: 4, maxQuantity: null },
  layer: { boxes: 16, rolls: 64, maxQuantity: 0 },
  half_pallet: { boxes: 32, rolls: 128, maxQuantity: 0 },
  full_pallet: { boxes: 48, rolls: 192, maxQuantity: null },
} as const;

export const MACHINE_PACKAGE_LADDER = {
  half_pallet: { rolls: 20, maxQuantity: 1 },
  full_pallet: { rolls: 40, maxQuantity: null },
} as const;

export interface PackageRequest {
  film: FilmKind;
  widthInches: number;
  tier: PackageTier;
  quantity: number;
}

export interface ValidPackage {
  film: FilmKind;
  widthInches: number;
  tier: PackageTier;
  quantity: number;
  rolls: number;
  boxes: number;
  /** Box-equivalent count used by freight rules (2 Manual full pallets = 96 boxes). */
  freightBoxCount: number;
}

function positiveInteger(value: number): number | null {
  if (!Number.isFinite(value) || value < 1) return null;
  const quantity = Math.floor(value);
  return quantity === value ? quantity : null;
}

export function validatePackageQuantity(
  input: PackageRequest
): AssistantResult<ValidPackage> {
  const quantity = positiveInteger(input.quantity);
  if (quantity == null) {
    return { ok: false, error: "Quantity must be a whole number of 1 or more." };
  }
  if (quantity > MAX_PACKAGE_QUANTITY) {
    return {
      ok: false,
      error: `Quantity cannot exceed ${MAX_PACKAGE_QUANTITY} packages in one quote.`,
    };
  }

  const width = Math.round(Number(input.widthInches) || 0);
  if (input.film !== "machine" && input.film !== "hand") {
    return { ok: false, error: "Choose hand film or machine film." };
  }

  if (input.film === "machine") {
    if (width !== 20) {
      return {
        ok: false,
        error: 'Machine film is sold only in 20" width, as a Half Pallet or a Full Pallet.',
      };
    }
    if (input.tier === "box" || input.tier === "layer") {
      return {
        ok: false,
        error:
          'Machine film (20") is sold only as Half Pallet (20 rolls / 1 layer) or Full Pallet (40 rolls / 2 layers). There is no box or 64-roll layer.',
      };
    }
    if (input.tier === "half_pallet" && quantity > 1) {
      return {
        ok: false,
        error:
          "Half Pallet is limited to 1 unit. Select Full Pallet to order 2 or more pallets.",
      };
    }
    const spec = MACHINE_PACKAGE_LADDER[input.tier];
    return {
      ok: true,
      film: "machine",
      widthInches: 20,
      tier: input.tier,
      quantity,
      rolls: spec.rolls * quantity,
      boxes: 0,
      // Box-equivalent volume: half = 0.5 pallet (24), full = 48 per pallet.
      // Free local unlocks at 2 pallets (96 box-equivalents).
      freightBoxCount:
        input.tier === "half_pallet"
          ? Math.round(HOUSTON_FREE_DELIVERY_BOXES / 4) * quantity
          : Math.round(HOUSTON_FREE_DELIVERY_BOXES / 2) * quantity,
    };
  }

  if (width === 20) {
    return {
      ok: false,
      error: '20" film is machine film. Choose machine film and a Half Pallet or Full Pallet.',
    };
  }
  if (width !== 15 && width !== 18) {
    return {
      ok: false,
      error: 'Hand film is sold in 15" and 18" widths.',
    };
  }

  if (input.tier === "layer" || input.tier === "half_pallet") {
    return {
      ok: false,
      error:
        "Manual film is sold only as 1 Box or Full Pallet (48 boxes / 192 rolls).",
    };
  }

  const spec = HAND_PACKAGE_LADDER[input.tier];
  if (spec.maxQuantity != null && quantity > spec.maxQuantity) {
    if (input.tier === "box") {
      return {
        ok: false,
        error:
          "1 Box allows 1 to 15 boxes. For larger volume, select Full Pallet (48 boxes / 192 rolls).",
      };
    }
    return {
      ok: false,
      error:
        "Manual film is sold only as 1 Box or Full Pallet (48 boxes / 192 rolls).",
    };
  }

  return {
    ok: true,
    film: "hand",
    widthInches: width,
    tier: input.tier,
    quantity,
    rolls: spec.rolls * quantity,
    boxes: spec.boxes * quantity,
    freightBoxCount: spec.boxes * quantity,
  };
}

export function validateCatalogSpec(input: {
  gauge?: number;
  lengthFeet?: number;
}): AssistantResult<{ gauge?: number; lengthFeet?: number }> {
  let gauge: number | undefined;
  if (input.gauge != null) {
    const value = Number(input.gauge);
    if (!(CATALOG_GAUGES as readonly number[]).includes(value)) {
      return { ok: false, error: "Gauge must be 40, 51, 60, 70, or 80." };
    }
    gauge = value;
  }

  let lengthFeet: number | undefined;
  if (input.lengthFeet != null) {
    const value = Number(input.lengthFeet);
    if (!Number.isInteger(value) || value < MIN_LENGTH_FEET || value > MAX_LENGTH_FEET) {
      return {
        ok: false,
        error: `Length must be a whole number from ${MIN_LENGTH_FEET.toLocaleString("en-US")} to ${MAX_LENGTH_FEET.toLocaleString("en-US")} feet.`,
      };
    }
    lengthFeet = value;
  }

  return { ok: true, gauge, lengthFeet };
}
