/**
 * Client-safe Free Local Delivery rules for Houston & Rio Grande Valley (RGV).
 * Minimum: 2 full-pallet equivalents (Manual and/or Automatic combined).
 */
import { HAND_FULL_PALLET_BOXES } from "@/lib/pricing";
import { formatPalletCount, roundPalletStock } from "@/lib/pallet-stock";

export const FREE_LOCAL_DELIVERY_MIN_PALLETS = 2;
/** Machine full pallet = 40 rolls. */
export const MACHINE_FULL_PALLET_ROLLS = 40;
/** Manual rolls on one full pallet (48 boxes × 4). */
export const HAND_FULL_PALLET_ROLLS = HAND_FULL_PALLET_BOXES * 4;

export const FREE_LOCAL_DELIVERY_LABEL = "Free Local Delivery (2+ Pallets)";
export const FREE_LOCAL_DELIVERY_PROMO =
  "FREE Local Delivery to Houston & RGV on orders of 2+ Pallets";

/**
 * Equivalent full-pallet volume from freight totals.
 * Hand boxes → boxes/48. Remaining rolls (after hand 4/box) → rolls/40 for Automatic.
 */
export function equivalentPalletCount(input: {
  boxes?: number | null;
  rolls?: number | null;
  pallets?: number | null;
}): number {
  if (input.pallets != null && Number.isFinite(Number(input.pallets))) {
    return roundPalletStock(Math.max(0, Number(input.pallets)));
  }
  const boxes = Math.max(0, Math.floor(Number(input.boxes) || 0));
  const rolls = Math.max(0, Math.round(Number(input.rolls) || 0));
  const handRolls = boxes * 4;
  const machineRolls = Math.max(0, rolls - handRolls);
  return roundPalletStock(
    boxes / HAND_FULL_PALLET_BOXES + machineRolls / MACHINE_FULL_PALLET_ROLLS
  );
}

export function qualifiesForFreeLocalDelivery(pallets: number): boolean {
  return roundPalletStock(pallets) + 1e-9 >= FREE_LOCAL_DELIVERY_MIN_PALLETS;
}

/** Whole pallets still needed (ceil), for friendly cart copy. */
export function palletsShortOfFreeLocal(pallets: number): number {
  const short = FREE_LOCAL_DELIVERY_MIN_PALLETS - roundPalletStock(pallets);
  if (short <= 0) return 0;
  return Math.max(1, Math.ceil(short - 1e-9));
}

export function freeLocalDeliveryUnlockMessage(pallets: number): string {
  const need = palletsShortOfFreeLocal(pallets);
  if (need <= 0) return "";
  if (need === 1) {
    return "Add 1 more pallet to qualify for FREE Houston & RGV Local Delivery!";
  }
  return `Add ${formatPalletCount(need)} more pallets to qualify for FREE Houston & RGV Local Delivery!`;
}
