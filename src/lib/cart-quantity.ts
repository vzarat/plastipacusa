export const HALF_PALLET_QTY_NOTE =
  "Half Pallets are limited to 1 unit per order. Switch tier to Full Pallet to order higher volumes.";

export const LAYER_QTY_NOTE =
  "1 Layer option is limited to 1 unit. Select Full Pallet for larger orders.";

export const BOX_QTY_NOTE =
  "16 boxes equal 1 Layer. Please select the '1 Layer' tier option.";

export const HAND_BOX_MAX_QUANTITY = 15;

export type CartPackageKind = "half" | "layer" | "box" | "full" | "open";

export interface CartPackageInput {
  application?: string | null;
  packageSize?: string | null;
  pricingTier?: string | null;
  rollsPerBox?: number | null;
  totalBoxes?: number | null;
}

export function cartPackageKind(item: CartPackageInput): CartPackageKind {
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
  if (kind === "half" && quantity > 1) {
    return { quantity: 1, notice: HALF_PALLET_QTY_NOTE };
  }
  if (kind === "layer" && quantity > 1) {
    return { quantity: 1, notice: LAYER_QTY_NOTE };
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

export function canIncreaseCartQuantity(item: CartPackageInput, _quantity: number): boolean {
  const kind = cartPackageKind(item);
  if (kind === "half" || kind === "layer") return false;
  return true;
}
