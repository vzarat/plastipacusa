/**
 * Product catalog helpers & warehouse palletizing metadata.
 * Prefer importing from `@/lib/palletizing` for pack-out rules.
 */
export {
  resolvePalletizingSpecs,
  isExcludedFifteenInchEightyGauge,
  fullPalletPackageLabel,
  type PalletizingSpecs,
  type PalletizingInput,
} from "@/lib/palletizing";
