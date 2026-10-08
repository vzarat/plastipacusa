import { HAND_PACKAGE_LADDER } from "@/lib/assistant/packaging-rules";

/**
 * Film-per-pallet rates used by estimateUsage.
 * Hand rolls per box come from the storefront ladder.
 * Rolls or pounds used to wrap one pallet are unset until a catalog table stores them.
 * Do not fill these with a guessed yield.
 */
export interface UsageRates {
  handRollsPerBox: number;
  machineRollsPerWrappedPallet: number | null;
  machinePoundsPerWrappedPallet: number | null;
}

export const USAGE_RATES: UsageRates = {
  handRollsPerBox: HAND_PACKAGE_LADDER.box.rolls,
  machineRollsPerWrappedPallet: null,
  machinePoundsPerWrappedPallet: null,
};
