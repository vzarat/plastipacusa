/**
 * Manual / hand stretch film storefront packaging.
 * Strict 2-tier purchase model: 1 Box + Full Pallet (48 boxes / 192 rolls).
 */

import {
  HAND_FULL_PALLET_BOXES,
  HAND_FULL_PALLET_ROLLS,
  HAND_ROLLS_PER_BOX,
  type BoxTierPrices,
  unitBoxPriceForCount,
} from "@/lib/pricing";

export const HAND_PALLET_WEIGHT_NOTE =
  "Includes wooden pallet weight (40 lbs) for LTL freight accuracy.";

export type HandManualTierKey = "box" | "full";

export interface HandManualPackageTier {
  key: HandManualTierKey;
  boxes: number;
  rolls: number;
  title: string;
  subtext: string;
}

export interface HandPalletLayoutInput {
  boxesPerPallet?: number | null;
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  application?: string | null;
}

/** Standardized manual full pallet: always 48 boxes / 192 rolls. */
export function handFullPalletBoxes(_input?: HandPalletLayoutInput): number {
  return HAND_FULL_PALLET_BOXES;
}

/**
 * Strict 2-tier menu for every manual product page:
 * 1 Box + Full Pallet (48 boxes / 192 rolls).
 */
export function buildHandManualPackageTiers(
  _input?: HandPalletLayoutInput
): HandManualPackageTier[] {
  const fullBoxes = HAND_FULL_PALLET_BOXES;
  const fullRolls = HAND_FULL_PALLET_ROLLS;
  const rollsPerBox = HAND_ROLLS_PER_BOX;

  return [
    {
      key: "box",
      boxes: 1,
      rolls: rollsPerBox,
      title: "1 Box",
      subtext: `Sample / Single box purchase · ${rollsPerBox} Rolls`,
    },
    {
      key: "full",
      boxes: fullBoxes,
      rolls: fullRolls,
      title: `Full Pallet (${fullRolls} Rolls / ${fullBoxes} Boxes)`,
      subtext: `${fullRolls} Rolls · ${fullBoxes} master boxes. ${HAND_PALLET_WEIGHT_NOTE}`,
    },
  ];
}

/**
 * Resolve the per-box rate for a manual tier.
 * Box → 1-box unit price. Full → full-pallet discounted per-box price.
 */
export function unitPriceForHandManualTier(
  prices: BoxTierPrices | null | undefined,
  tier: HandManualTierKey,
  boxes: number
): number | null {
  if (!prices) return null;
  if (tier === "box") {
    return prices.price1Box != null && prices.price1Box > 0
      ? prices.price1Box
      : unitBoxPriceForCount(prices, 1);
  }
  return (
    (prices.price64Boxes != null && prices.price64Boxes > 0
      ? prices.price64Boxes
      : null) ?? unitBoxPriceForCount(prices, boxes)
  );
}

/** True when a box/roll count is one of the two allowed manual tiers. */
export function isAllowedHandManualPack(
  _input: HandPalletLayoutInput,
  boxes: number,
  rolls?: number
): boolean {
  const tiers = buildHandManualPackageTiers();
  const boxCount = Math.floor(Number(boxes) || 0);
  const rollCount = Math.floor(Number(rolls) || 0);
  return tiers.some(
    (tier) =>
      tier.boxes === boxCount ||
      (rollCount > 0 && tier.rolls === rollCount)
  );
}
