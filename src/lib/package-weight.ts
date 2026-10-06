/** Wooden pallet added to layer, half-pallet, and full-pallet totals. 10 kg. */
export const WOODEN_PALLET_LBS = 22.05;

/** Official 20" automated machine film weights, including the wooden pallet on half and full pallets. */
export const MACHINE_FILM_WEIGHT_SPECS = [
  { width: 20, gauge: 51, length: 7000, roll: 30.6, half: 634.1, full: 1246.1 },
  { width: 20, gauge: 51, length: 9000, roll: 38.78, half: 797.7, full: 1573.3 },
  { width: 20, gauge: 60, length: 5000, roll: 25.9, half: 540.0, full: 1058.0 },
  { width: 20, gauge: 70, length: 5000, roll: 30.05, half: 623.1, full: 1224.1 },
  { width: 20, gauge: 80, length: 5000, roll: 34.06, half: 703.3, full: 1384.5 },
] as const;

export interface PackageWeightInput {
  rolls?: number | null;
  boxes?: number | null;
  rollWeightLbs?: number | null;
  boxWeightLbs?: number | null;
  palletWeightLbs?: number | null;
  weightLbs?: number | string | null;
  machine?: boolean;
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
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

function officialMachineWeight(
  input: PackageWeightInput,
  rolls: number
): number | null {
  const width = Math.round(Number(input.widthInches) || 0);
  const gauge = Math.round(Number(input.gauge) || 0);
  const length = Math.round(Number(input.lengthFeet) || 0);
  const spec = MACHINE_FILM_WEIGHT_SPECS.find(
    (row) => row.width === width && row.gauge === gauge && row.length === length
  );
  if (!spec) return null;
  if (rolls >= 40) return spec.full;
  if (rolls === 20) return spec.half;
  return null;
}

export function packageTotalWeightLbs(input: PackageWeightInput): number | null {
  const rolls = positive(input.rolls) ?? 0;
  const boxes = positive(input.boxes) ?? 0;
  const rollWeight = positive(input.rollWeightLbs);
  const boxWeight = positive(input.boxWeightLbs);
  const palletWeight = positive(input.palletWeightLbs);
  const perRoll = rollWeight ?? (boxWeight != null && !input.machine ? boxWeight / 4 : boxWeight);

  if (input.machine) {
    const official = officialMachineWeight(input, rolls);
    if (official != null && (rolls === 20 || rolls === 40)) {
      return official;
    }
    const machineRoll = rollWeight ?? boxWeight;
    if (rolls === 40) {
      if (palletWeight != null) return roundLbs(palletWeight, 1);
      if (machineRoll != null) return roundLbs(machineRoll * 40 + WOODEN_PALLET_LBS, 1);
    }
    if (rolls === 20 && machineRoll != null) {
      return roundLbs(machineRoll * 20 + WOODEN_PALLET_LBS, 1);
    }
    if (machineRoll != null) return roundLbs(machineRoll, 2);
    return storedPackageWeight(input.weightLbs);
  }

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
