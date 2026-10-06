/** Wooden pallet added to layer, half-pallet, and full-pallet totals. 10 kg. */
export const WOODEN_PALLET_LBS = 22.05;

export interface PackageWeightInput {
  rolls?: number | null;
  boxes?: number | null;
  rollWeightLbs?: number | null;
  boxWeightLbs?: number | null;
  palletWeightLbs?: number | null;
  weightLbs?: number | string | null;
}

function positive(value: unknown): number | null {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

/** Ignore the old placeholder written when a variant had no weight. */
function storedPackageWeight(value: unknown): number | null {
  const amount = positive(value);
  if (amount == null || amount === 12) return null;
  return amount;
}

function roundLbs(amount: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function packageTotalWeightLbs(input: PackageWeightInput): number | null {
  const rolls = positive(input.rolls) ?? 0;
  const boxes = positive(input.boxes) ?? 0;
  const rollWeight = positive(input.rollWeightLbs);
  const boxWeight = positive(input.boxWeightLbs);
  const palletWeight = positive(input.palletWeightLbs);
  const perRoll = rollWeight ?? (boxWeight != null ? boxWeight / 4 : null);

  const isFullPallet = rolls === 256 || boxes === 64;
  const isHalfPallet = rolls === 128 || boxes === 32;
  const isLayer = rolls === 64 || boxes === 16;
  const isBox = rolls === 4 || boxes === 1;
  const filmOnPallet =
    palletWeight != null ? palletWeight - WOODEN_PALLET_LBS : null;

  if (isFullPallet) {
    if (palletWeight != null) return roundLbs(palletWeight, 1);
    if (perRoll != null) return roundLbs(perRoll * 256 + WOODEN_PALLET_LBS, 1);
  }

  if (isHalfPallet) {
    if (filmOnPallet != null && filmOnPallet > 0) {
      return roundLbs(filmOnPallet * (128 / 256) + WOODEN_PALLET_LBS, 1);
    }
    if (perRoll != null) return roundLbs(perRoll * 128 + WOODEN_PALLET_LBS, 1);
  }

  if (isLayer) {
    if (filmOnPallet != null && filmOnPallet > 0) {
      return roundLbs(filmOnPallet * (64 / 256) + WOODEN_PALLET_LBS, 1);
    }
    if (perRoll != null) return roundLbs(perRoll * 64 + WOODEN_PALLET_LBS, 1);
  }

  if (isBox) {
    if (boxWeight != null) return roundLbs(boxWeight, 2);
    if (perRoll != null) return roundLbs(perRoll * 4, 2);
  }

  if (perRoll != null && rolls > 0) {
    return roundLbs(perRoll * rolls, 2);
  }

  return storedPackageWeight(input.weightLbs);
}

export function formatPackageWeightLbs(weight: number | null): string {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return "—";
  const digits = weight >= 100 ? 1 : 2;
  return `${weight.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} lbs`;
}
