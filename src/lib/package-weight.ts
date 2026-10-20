/** Older 10 kg tare still shown on the packaging CSV pallet column. */
export const WOODEN_PALLET_LBS = 22.05;

/** Wooden pallet added once to every 16-, 32-, and 64-box hand-film shipment. */
export const HAND_WOODEN_PALLET_LBS = 29.18;

/** Official 20" automated machine film weights, including the wooden pallet on half and full pallets. */
export const MACHINE_FILM_WEIGHT_SPECS = [
  { width: 20, gauge: 51, length: 7000, roll: 30.600162, half: 638, full: 1250.01, tare: 25.99352 },
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

function machineFilmSpec(input: PackageWeightInput) {
  const width = Math.round(positive(input.widthInches) ?? 0);
  const gauge = Math.round(positive(input.gauge) ?? 0);
  const length = Math.round(positive(input.lengthFeet) ?? 0);
  return (
    MACHINE_FILM_WEIGHT_SPECS.find(
      (spec) => spec.width === width && spec.gauge === gauge && spec.length === length
    ) ?? null
  );
}

/** Same roll weight the spec matrix uses when the variant row has no roll_weight_lbs. */
function machineSpecRollWeight(input: PackageWeightInput): number | null {
  return machineFilmSpec(input)?.roll ?? null;
}

function roundLbs(amount: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function packageTotalWeightLbs(input: PackageWeightInput): number | null {
  const rolls = positive(input.rolls) ?? 0;
  const boxes = positive(input.boxes) ?? 0;
  const rollWeight = positive(input.rollWeightLbs) ?? (input.machine ? machineSpecRollWeight(input) : null);
  const boxWeight = positive(input.boxWeightLbs);
  const palletWeight = positive(input.palletWeightLbs);
  const perRoll = rollWeight ?? (boxWeight != null && !input.machine ? boxWeight / 4 : boxWeight);

  if (input.machine) {
    const machineRoll = rollWeight ?? boxWeight;
    const spec = machineFilmSpec(input);
    if (rolls >= 40 && spec) return spec.full;
    if (rolls === 20 && spec) return spec.half;
    if (rolls === 40) {
      if (palletWeight != null) return roundLbs(palletWeight, 2);
      if (machineRoll != null) return roundLbs(machineRoll * 40 + WOODEN_PALLET_LBS, 1);
    }
    if (rolls === 20 && machineRoll != null) {
      return roundLbs(machineRoll * 20 + WOODEN_PALLET_LBS, 1);
    }
    if ((rolls === 1 || rolls === 0) && spec) return spec.roll;
    if (machineRoll != null) return roundLbs(machineRoll, 2);
    return storedPackageWeight(input.weightLbs);
  }

  const isFullPallet = rolls === 256 || boxes === 64;
  const isHalfPallet = rolls === 128 || boxes === 32;
  const isLayer = rolls === 64 || boxes === 16;
  const isBox = rolls === 4 || boxes === 1;

  if (isFullPallet) {
    if (palletWeight != null) return roundLbs(palletWeight, 2);
    if (boxWeight != null) return roundLbs(boxWeight * 64 + HAND_WOODEN_PALLET_LBS, 2);
    if (perRoll != null) return roundLbs(perRoll * 256 + HAND_WOODEN_PALLET_LBS, 2);
  }

  if (isHalfPallet) {
    if (boxWeight != null) return roundLbs(boxWeight * 32 + HAND_WOODEN_PALLET_LBS, 2);
    if (perRoll != null) return roundLbs(perRoll * 128 + HAND_WOODEN_PALLET_LBS, 2);
  }

  if (isLayer) {
    if (boxWeight != null) return roundLbs(boxWeight * 16 + HAND_WOODEN_PALLET_LBS, 2);
    if (perRoll != null) return roundLbs(perRoll * 64 + HAND_WOODEN_PALLET_LBS, 2);
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

export interface HandShippingUnit {
  boxes: number;
  quantity: number;
  weightLbs: number;
  tier: "full" | "half" | "layer" | "loose";
}

/** Wooden pallet implied by the package table: 16-box tier weight minus 16 box weights. */
export function packagePalletTareLbs(boxWeightLbs: number, layerWeightLbs: number): number | null {
  const tare = roundLbs(layerWeightLbs - 16 * boxWeightLbs, 2);
  if (!(tare > 0)) return null;
  return tare;
}

/** Split a hand-film box count into full, half, layer, and loose units using the package-table weights. */
export function packHandShippingUnits(input: {
  boxes: number;
  boxWeightLbs: number | null;
  palletWeightLbs: number | null;
}): HandShippingUnit[] | null {
  const boxes = Math.round(input.boxes);
  if (boxes <= 0) return null;
  const tier = (count: number, rolls: number) =>
    packageTotalWeightLbs({
      boxes: count,
      rolls,
      boxWeightLbs: input.boxWeightLbs,
      palletWeightLbs: input.palletWeightLbs,
    });
  const box = tier(1, 4);
  const layer = tier(16, 64);
  const half = tier(32, 128);
  const full = tier(64, 256);
  if (box == null || layer == null || half == null || full == null) return null;

  const units: HandShippingUnit[] = [];
  let left = boxes;
  const fullCount = Math.floor(left / 64);
  if (fullCount > 0) {
    units.push({ boxes: 64, quantity: fullCount, weightLbs: roundLbs(full * fullCount, 2), tier: "full" });
    left -= fullCount * 64;
  }
  if (left >= 32) {
    units.push({ boxes: 32, quantity: 1, weightLbs: half, tier: "half" });
    left -= 32;
  }
  if (left >= 16) {
    units.push({ boxes: 16, quantity: 1, weightLbs: layer, tier: "layer" });
    left -= 16;
  }
  if (left > 0) {
    units.push({ boxes: left, quantity: left, weightLbs: roundLbs(box * left, 2), tier: "loose" });
  }
  return units;
}

/** Gross weight of one cart package. Same function the spec matrix uses. */
export function quotePackageWeightLbs(input: {
  application?: string | null;
  boxes?: number | null;
  rolls?: number | null;
  weightLbs?: number | string | null;
  rollWeightLbs?: number | null;
  boxWeightLbs?: number | null;
  palletWeightLbs?: number | null;
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
}): number | null {
  const computed = packageTotalWeightLbs({
    boxes: input.boxes,
    rolls: input.rolls,
    weightLbs: input.weightLbs,
    rollWeightLbs: input.rollWeightLbs,
    boxWeightLbs: input.boxWeightLbs,
    palletWeightLbs: input.palletWeightLbs,
    machine: String(input.application || "").toLowerCase() === "machine",
    widthInches: input.widthInches,
    gauge: input.gauge,
    lengthFeet: input.lengthFeet,
  });
  if (computed != null && computed > 0) return computed;
  const stored = positive(input.weightLbs);
  return stored != null && stored !== 12 ? stored : null;
}

export function formatPackageWeightLbs(weight: number | null): string {
  if (weight == null || !Number.isFinite(weight) || weight <= 0) return "—";
  const digits = weight >= 100 ? 1 : 2;
  return `${weight.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} lbs`;
}

/** Film weight plus the wooden pallet, only after a half or full pallet. */
export function formatPalletizedWeight(grossLbs: number, palletCount = 1): string {
  const pallets = Math.max(1, palletCount);
  const film = Math.max(0, grossLbs - WOODEN_PALLET_LBS * pallets);
  const filmLabel = formatPackageWeightLbs(film);
  if (pallets === 1) return `${filmLabel} + 22.05 lbs (Pallet Base)`;
  return `${filmLabel} + ${pallets} × 22.05 lbs (Pallet Base)`;
}
