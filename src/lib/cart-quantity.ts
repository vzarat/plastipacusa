export const HALF_PALLET_QTY_NOTE =
  "Half Pallet is limited to 1 unit. Select 'Full Pallet' to order 2 or more pallets.";

export const LAYER_QTY_NOTE =
  "1 Layer option is limited to 1 unit. Select 'Full Pallet' for higher volume.";

export const BOX_QTY_NOTE =
  "16 boxes equal 1 Layer. Switch to '1 Layer' option for layer pricing.";

export const TIER_MAX_ONE_WARNING =
  "Maximum 1 unit allowed for Half Pallet / Layer tiers. Please select Full Pallet for higher quantities.";

export const HAND_BOX_MAX_QUANTITY = 15;

export type CartPackageKind = "half" | "layer" | "box" | "full" | "open";

export interface CartPackageInput {
  application?: string | null;
  packageSize?: string | null;
  pricingTier?: string | null;
  rollsPerBox?: number | null;
  totalBoxes?: number | null;
  tierType?: string | null;
  tier_type?: string | null;
}

export function cartPackageKind(item: CartPackageInput): CartPackageKind {
  const tier = String(item.tierType || item.tier_type || "").toLowerCase();
  if (tier === "half_pallet" || tier === "fixed_half" || tier === "half") return "half";
  if (tier === "layer" || tier === "fixed_mid") return "layer";
  if (tier === "box" || tier === "single_unit") return "box";
  if (tier === "full_pallet" || tier === "full") return "full";

  const label = `${item.packageSize || ""} ${item.pricingTier || ""}`.toUpperCase();
  const rolls = Number(item.rollsPerBox) || 0;
  const boxes = Number(item.totalBoxes) || 0;

  if (label.includes("HALF PALLET") || rolls === 20 || rolls === 128 || boxes === 32) {
    return "half";
  }
  if (label.includes("FULL PALLET") || rolls === 40 || rolls === 256 || boxes === 64) {
    return "full";
  }
  if (label.includes("1 LAYER") || label.includes("16 BOX") || rolls === 64 || boxes === 16) {
    return "layer";
  }
  if (label.includes("1 BOX") || rolls === 4 || boxes === 1) {
    return "box";
  }
  return "open";
}

export function clampCartQuantity(
  item: CartPackageInput,
  requested: number
): { quantity: number; notice: string | null } {
  const kind = cartPackageKind(item);
  const quantity = Math.floor(Number(requested));
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { quantity: 1, notice: null };
  }
  if ((kind === "half" || kind === "layer") && quantity > 1) {
    return { quantity: 1, notice: TIER_MAX_ONE_WARNING };
  }
  if (kind === "box" && quantity > HAND_BOX_MAX_QUANTITY) {
    return { quantity: HAND_BOX_MAX_QUANTITY, notice: BOX_QTY_NOTE };
  }
  return { quantity, notice: null };
}

export function cartQuantityNote(item: CartPackageInput, quantity: number): string | null {
  const kind = cartPackageKind(item);
  if (kind === "half") return HALF_PALLET_QTY_NOTE;
  if (kind === "layer") return LAYER_QTY_NOTE;
  if (kind === "box" && quantity >= HAND_BOX_MAX_QUANTITY) return BOX_QTY_NOTE;
  return null;
}

export function cartQuantityMax(item: CartPackageInput): number | undefined {
  const kind = cartPackageKind(item);
  if (kind === "half" || kind === "layer") return 1;
  if (kind === "box") return HAND_BOX_MAX_QUANTITY;
  return undefined;
}

export function canIncreaseCartQuantity(item: CartPackageInput, quantity: number): boolean {
  const kind = cartPackageKind(item);
  if ((kind === "half" || kind === "layer") && quantity >= 1) return false;
  return true;
}
