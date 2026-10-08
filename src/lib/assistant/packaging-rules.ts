import type { AssistantResult, FilmKind, PackageTier } from "@/lib/assistant/types";
import {
  HOUSTON_FREE_DELIVERY_BOXES,
  RGV_FREE_DELIVERY_BOXES,
} from "@/lib/shippingRules";

export const HAND_BOX_MAX_QUANTITY = 15;
export const MAX_PACKAGE_QUANTITY = 40;
export const CATALOG_GAUGES = [51, 60, 70, 80] as const;
export const MIN_LENGTH_FEET = 500;
export const MAX_LENGTH_FEET = 12000;

/** Storefront hand-film ladder. Price = box price × boxes × (1 − discount). */
export const HAND_PACKAGE_LADDER = {
  box: { boxes: 1, rolls: 4, discountRate: 0, maxQuantity: HAND_BOX_MAX_QUANTITY },
  layer: { boxes: 16, rolls: 64, discountRate: 0.05, maxQuantity: 1 },
  half_pallet: { boxes: 32, rolls: 128, discountRate: 0.0625, maxQuantity: 1 },
  full_pallet: { boxes: 64, rolls: 256, discountRate: 0.10625, maxQuantity: null },
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
  /** Box count the freight rules already use (RGV 16, Houston 64). */
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
      freightBoxCount:
        input.tier === "half_pallet"
          ? RGV_FREE_DELIVERY_BOXES
          : HOUSTON_FREE_DELIVERY_BOXES * quantity,
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

  const spec = HAND_PACKAGE_LADDER[input.tier];
  if (spec.maxQuantity != null && quantity > spec.maxQuantity) {
    if (input.tier === "box") {
      return {
        ok: false,
        error:
          "16 boxes equal 1 Layer. 1 Box allows 1 to 15 boxes. Switch to the 1 Layer tier.",
      };
    }
    if (input.tier === "layer") {
      return {
        ok: false,
        error:
          "1 Layer is limited to 1 unit. Select Half Pallet or Full Pallet for higher quantities.",
      };
    }
    return {
      ok: false,
      error:
        "Half Pallet is limited to 1 unit. Select Full Pallet to order 2 or more pallets.",
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
      return { ok: false, error: "Gauge must be 51, 60, 70, or 80." };
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
