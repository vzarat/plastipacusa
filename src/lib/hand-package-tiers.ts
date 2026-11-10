/**
 * Manual / hand stretch film storefront packaging.
 * Strict 2-tier purchase model: 1 Box + Full Pallet only.
 */

import { formatBoxRollLabel } from "@/lib/products";
import { boxesPerPalletForProduct } from "@/lib/pallet-stock";
import {
  HAND_ROLLS_PER_BOX,
  type BoxTierPrices,
  unitBoxPriceForCount,
} from "@/lib/pricing";

export const HAND_PALLET_WEIGHT_NOTE =
  "Includes wooden pallet weight (~29.2 lbs) for LTL freight accuracy.";

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

/** Full-pallet box count for a manual SKU (stored boxes_per_pallet wins). */
export function handFullPalletBoxes(input: HandPalletLayoutInput): number {
  const full = boxesPerPalletForProduct({
    application: "hand",
    boxesPerPallet: input.boxesPerPallet,
    widthInches: input.widthInches,
    gauge: input.gauge,
    lengthFeet: input.lengthFeet,
    slug: input.slug,
    name: input.name || input.title,
  });
  return Math.max(2, full);
}

/**
 * Strict 2-tier menu for every manual product page:
 * 1 Box (sample / single) and Full Pallet (boxes_per_pallet).
 */
export function buildHandManualPackageTiers(
  input: HandPalletLayoutInput
): HandManualPackageTier[] {
  const fullBoxes = handFullPalletBoxes(input);
  const rollsPerBox = HAND_ROLLS_PER_BOX;
  const fullRolls = fullBoxes * rollsPerBox;

  return [
    {
      key: "box",
      boxes: 1,
      rolls: rollsPerBox,
      title: formatBoxRollLabel(1, rollsPerBox),
      subtext: `${rollsPerBox} Rolls included · Sample / single box purchase`,
    },
    {
      key: "full",
      boxes: fullBoxes,
      rolls: fullRolls,
      title: `Full Pallet · ${formatBoxRollLabel(fullBoxes, fullRolls)}`,
      subtext: `${formatBoxRollLabel(fullBoxes, fullRolls)}. ${HAND_PALLET_WEIGHT_NOTE}`,
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
      : null) ??
    unitBoxPriceForCount(prices, boxes) ??
    (prices.price32Boxes != null && prices.price32Boxes > 0
      ? prices.price32Boxes
      : null)
  );
}

/** True when a box/roll count is one of the two allowed manual tiers for that SKU. */
export function isAllowedHandManualPack(
  input: HandPalletLayoutInput,
  boxes: number,
  rolls?: number
): boolean {
  const tiers = buildHandManualPackageTiers(input);
  const boxCount = Math.floor(Number(boxes) || 0);
  const rollCount = Math.floor(Number(rolls) || 0);
  return tiers.some(
    (tier) =>
      tier.boxes === boxCount ||
      (rollCount > 0 && tier.rolls === rollCount)
  );
}
