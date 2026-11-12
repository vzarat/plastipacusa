import { MACHINE_FILM_WEIGHT_SPECS as MASTER_MACHINE_WEIGHTS } from "@/lib/machine-film-master";

/** Older 10 kg tare still shown on the packaging CSV pallet column (machine / legacy). */
export const WOODEN_PALLET_LBS = 22.05;

/** Wooden pallet added once to every full-pallet (48-box) Manual shipment (Excel master). */
export const HAND_WOODEN_PALLET_LBS = 40;

/** Official 20" automated machine film weights, including the wooden pallet on half and full pallets. */
export const MACHINE_FILM_WEIGHT_SPECS = MASTER_MACHINE_WEIGHTS;

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
    // Prefer official scale sheet (tare already included). Else use tier-stored
    // pallet_weight_lbs. Fallback formula adds 10 kg / 22.05 lb wooden tare —
    // Automatic does NOT use the Manual 40 lb tare.
    if (rolls >= 40) {
      if (spec) return spec.full;
      if (palletWeight != null) return roundLbs(palletWeight, 2);
      if (machineRoll != null) return roundLbs(machineRoll * 40 + WOODEN_PALLET_LBS, 1);
    }
    if (rolls === 20) {
      if (spec) return spec.half;
      if (palletWeight != null) return roundLbs(palletWeight, 2);
      if (machineRoll != null) return roundLbs(machineRoll * 20 + WOODEN_PALLET_LBS, 1);
    }
    if ((rolls === 1 || rolls === 0) && spec) return spec.roll;
    if (machineRoll != null) return roundLbs(machineRoll, 2);
    return storedPackageWeight(input.weightLbs);
  }

  const isBox = rolls === 4 || boxes === 1;
  // Standardized manual full pallet: 48 boxes / 192 rolls (+ wooden pallet tare).
  const isFullPallet = boxes === 48 || rolls === 192;

  if (isFullPallet) {
    if (palletWeight != null) return roundLbs(palletWeight, 2);
    if (boxWeight != null) {
      return roundLbs(boxWeight * 48 + HAND_WOODEN_PALLET_LBS, 2);
    }
    if (perRoll != null) {
      return roundLbs(perRoll * 192 + HAND_WOODEN_PALLET_LBS, 2);
    }
  }

  if (isBox) {
    if (boxWeight != null) return roundLbs(boxWeight, 2);
    if (perRoll != null) return roundLbs(perRoll * 4, 2);
  }

  // Non-box packs still include wooden pallet tare for LTL accuracy.
  if (boxes > 1 || rolls > 4) {
    if (boxWeight != null && boxes > 0) {
      return roundLbs(boxWeight * boxes + HAND_WOODEN_PALLET_LBS, 2);
    }
    if (perRoll != null && rolls > 0) {
      return roundLbs(perRoll * rolls + HAND_WOODEN_PALLET_LBS, 2);
    }
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

/** Wooden pallet tare implied by a stacked tier weight minus N box weights (legacy audit helper). */
export function packagePalletTareLbs(boxWeightLbs: number, layerWeightLbs: number, boxes = 16): number | null {
  const tare = roundLbs(layerWeightLbs - boxes * boxWeightLbs, 2);
  if (!(tare > 0)) return null;
  return tare;
}

/** Split a hand-film box count into full pallets + loose boxes (2-tier Manual model). */
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
  const full = tier(48, 192);
  if (box == null || full == null) return null;

  const units: HandShippingUnit[] = [];
  let left = boxes;
  const fullCount = Math.floor(left / 48);
  if (fullCount > 0) {
    units.push({
      boxes: 48,
      quantity: fullCount,
      weightLbs: roundLbs(full * fullCount, 2),
      tier: "full",
    });
    left -= fullCount * 48;
  }
  if (left > 0) {
    units.push({
      boxes: left,
      quantity: left,
      weightLbs: roundLbs(box * left, 2),
      tier: "loose",
    });
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
