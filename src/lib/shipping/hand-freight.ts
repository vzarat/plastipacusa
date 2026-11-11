import { formatPackageWeightLbs, formatPalletizedWeight, HAND_WOODEN_PALLET_LBS } from "@/lib/package-weight";

/** One layer of 16 hand-film boxes on a 48 x 48 deck. Height follows 78 / 4 and 39 / 2. */
const HAND_LAYER_HEIGHT_IN = 19.5;
const HAND_BOX_EDGE_IN = 11;

/** Official Manual full-pallet footprints. 15" film is shorter; 18" keeps the standard height. */
export const HAND_FULL_PALLET_DIMS_15 = { lengthIn: 48, widthIn: 40, heightIn: 68 } as const;
export const HAND_FULL_PALLET_DIMS_18 = { lengthIn: 48, widthIn: 48, heightIn: 78 } as const;
export const HAND_FULL_PALLET_DIMENSIONS_15 = "48 x 40 x 68";
export const HAND_FULL_PALLET_DIMENSIONS_18 = "48 x 48 x 78";

export const HAND_FREIGHT_DIMENSIONS_IN = {
  loose: { lengthIn: HAND_BOX_EDGE_IN, widthIn: HAND_BOX_EDGE_IN, heightIn: HAND_LAYER_HEIGHT_IN },
  layer: { lengthIn: 48, widthIn: 48, heightIn: HAND_LAYER_HEIGHT_IN },
  half: { lengthIn: 48, widthIn: 48, heightIn: 39 },
  full: HAND_FULL_PALLET_DIMS_18,
} as const;

export type HandFreightTier = keyof typeof HAND_FREIGHT_DIMENSIONS_IN;

export function handFreightTier(boxes: number): HandFreightTier {
  if (boxes >= 48) return "full";
  return "loose";
}

export function handFreightDimensions(boxes: number) {
  return HAND_FREIGHT_DIMENSIONS_IN[handFreightTier(boxes)];
}

export interface HandlingUnit {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  quantity: number;
  includesPalletTare: boolean;
  packaging: "pallet" | "box";
}

function parseStoredPalletInches(value: string | null | undefined): {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
} | null {
  const match = String(value || "").match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
  );
  if (!match) return null;
  const lengthIn = Number(match[1]);
  const widthIn = Number(match[2]);
  const heightIn = Number(match[3]);
  if (lengthIn <= 0 || widthIn <= 0 || heightIn <= 0) return null;
  return { lengthIn, widthIn, heightIn };
}

/** Default Manual full-pallet L×W×H when products.pallet_dimensions is empty. */
export function handFullPalletFallbackDims(widthInches?: number | string | null): {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
} {
  const width = Math.round(Number(widthInches) || 0);
  if (width === 15) return { ...HAND_FULL_PALLET_DIMS_15 };
  return { ...HAND_FULL_PALLET_DIMS_18 };
}

/** Prefer stored products.pallet_dimensions; otherwise width-based Manual defaults. */
export function resolveHandFullPalletDims(input?: {
  palletDimensions?: string | null;
  widthInches?: number | string | null;
}): { lengthIn: number; widthIn: number; heightIn: number } {
  return (
    parseStoredPalletInches(input?.palletDimensions) ??
    handFullPalletFallbackDims(input?.widthInches)
  );
}

export function handHandlingUnit(
  boxes: number,
  widthInches?: number | string | null,
  palletDimensions?: string | null
): HandlingUnit {
  const count = Math.max(0, boxes);
  if (count >= 48) {
    const dims = resolveHandFullPalletDims({ palletDimensions, widthInches });
    return {
      lengthIn: dims.lengthIn,
      widthIn: dims.widthIn,
      heightIn: dims.heightIn,
      quantity: Math.ceil(count / 48),
      includesPalletTare: true,
      packaging: "pallet",
    };
  }
  const cols = Math.min(4, Math.max(1, count));
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / 4));
  return {
    lengthIn: cols * HAND_BOX_EDGE_IN,
    widthIn: rows * HAND_BOX_EDGE_IN,
    heightIn: HAND_LAYER_HEIGHT_IN,
    quantity: 1,
    includesPalletTare: false,
    packaging: "box",
  };
}

/** Every automatic film pallet, half or full, is 40" W x 48" L x 46" H including the wooden pallet. */
export const MACHINE_PALLET_HEIGHT_IN = 46;

export function machineHandlingUnit(_rolls: number, _widthInches: number): HandlingUnit {
  return {
    lengthIn: 48,
    widthIn: 40,
    heightIn: MACHINE_PALLET_HEIGHT_IN,
    quantity: 1,
    includesPalletTare: false,
    packaging: "pallet",
  };
}

export function formatFreightDimensions(unit: Pick<HandlingUnit, "lengthIn" | "widthIn" | "heightIn">): string {
  return `${formatInches(unit.widthIn)}" W x ${formatInches(unit.lengthIn)}" L x ${formatInches(unit.heightIn)}" H`;
}

export function formatFreightWeightLabel(grossLbs: number, unit: HandlingUnit): string {
  if (!unit.includesPalletTare) return formatPackageWeightLbs(grossLbs);
  return formatPalletizedWeight(grossLbs, unit.quantity);
}

function roundInches(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatInches(value: number): string {
  return Number.isInteger(value) ? String(value) : String(roundInches(value));
}

/**
 * Every manual carton is 11" W x 11" L x 19.5" H.
 * Skydropx uses the rounded meters. The exact conversion is 27.94 cm x 27.94 cm x 49.53 cm.
 */
export const HAND_BOX_SKYDROPX_M = {
  widthM: 0.28,
  lengthM: 0.28,
  heightM: 0.5,
} as const;

export const HAND_BOX_CM = {
  widthCm: 27.94,
  lengthCm: 27.94,
  heightCm: 49.53,
} as const;

export function handBoxHeightIn(_widthInches?: number | null): number {
  return HAND_LAYER_HEIGHT_IN;
}

export interface WarpHandPiece {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightLbs: number;
  quantity: number;
  packaging: "pallet" | "box";
}

function roundLbs(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Full-pallet box counts include one wooden pallet. A single box does not. */
export function handPalletTierWeightLbs(boxes: number, boxWeightLbs: number): number {
  return roundLbs(boxWeightLbs * boxes + HAND_WOODEN_PALLET_LBS);
}

/**
 * Warp handling units for a hand-film box count.
 * Manual 2-tier model: loose cartons under one full pallet, then 48-box full pallets.
 * Full-pallet L×W×H comes from products.pallet_dimensions (15" → 48×40×68).
 */
export function warpHandPieces(input: {
  boxes: number;
  widthInches?: number | null;
  palletDimensions?: string | null;
  boxWeightLbs: number | null;
  palletWeightLbs: number | null;
}): WarpHandPiece[] | null {
  const boxes = Math.max(0, Math.floor(Number(input.boxes) || 0));
  if (boxes < 1) return null;
  const boxWeight = Number(input.boxWeightLbs);
  const palletWeight = Number(input.palletWeightLbs);
  const boxOk = Number.isFinite(boxWeight) && boxWeight > 0;
  const palletOk = Number.isFinite(palletWeight) && palletWeight > 0;
  const fullPalletBoxes = 48;
  const fullDims = resolveHandFullPalletDims({
    palletDimensions: input.palletDimensions,
    widthInches: input.widthInches,
  });
  const palletTierWeight = (count: number): number | null => {
    if (count >= fullPalletBoxes && palletOk) return roundLbs(palletWeight);
    if (boxOk) return handPalletTierWeightLbs(count, boxWeight);
    return null;
  };
  const pieces: WarpHandPiece[] = [];
  let left = boxes;
  const fullCount = Math.floor(left / fullPalletBoxes);
  if (fullCount > 0) {
    const each = palletTierWeight(fullPalletBoxes);
    if (each == null) return null;
    pieces.push({
      lengthIn: fullDims.lengthIn,
      widthIn: fullDims.widthIn,
      heightIn: fullDims.heightIn,
      weightLbs: roundLbs(each * fullCount),
      quantity: fullCount,
      packaging: "pallet",
    });
    left -= fullCount * fullPalletBoxes;
  }
  if (left > 0) {
    if (!boxOk) return null;
    pieces.push({
      lengthIn: 11,
      widthIn: 11,
      heightIn: handBoxHeightIn(input.widthInches),
      weightLbs: Math.round(boxWeight * left * 100) / 100,
      quantity: left,
      packaging: "box",
    });
  }
  return pieces;
}

/** Deck height reserved when deriving legacy stacked-pallet inches from full height. */
export const HAND_MATRIX_PALLET_BASE_IN = 10;

/**
 * Specs-table sizes. One box stays a carton.
 * Full pallet (48 boxes) uses products.pallet_dimensions when that text is set.
 */
export function handMatrixDimensions(
  boxes: number,
  palletDimensions?: string | null,
  widthInches?: number | null
): { lengthIn: number; widthIn: number; heightIn: number } {
  const count = Math.max(0, Math.floor(Number(boxes) || 0));
  if (count >= 48) {
    return resolveHandFullPalletDims({ palletDimensions, widthInches });
  }
  return { lengthIn: HAND_BOX_EDGE_IN, widthIn: HAND_BOX_EDGE_IN, heightIn: handBoxHeightIn(widthInches) };
}

/** 1 box is box_weight_lbs. Full pallet (48 boxes) adds one 40 lb wooden pallet. */
export function handMatrixWeightLbs(
  boxes: number,
  boxWeightLbs: number | null,
  palletWeightLbs: number | null
): number | null {
  const count = Math.max(0, Math.floor(Number(boxes) || 0));
  const box = Number(boxWeightLbs);
  const pallet = Number(palletWeightLbs);
  const boxOk = Number.isFinite(box) && box > 0;
  const palletOk = Number.isFinite(pallet) && pallet > 0;
  if (count >= 48) {
    if (palletOk) return Math.round(pallet * 100) / 100;
    if (boxOk) return handPalletTierWeightLbs(48, box);
    return null;
  }
  if (count >= 1) return boxOk ? Math.round(box * count * 100) / 100 : null;
  return null;
}

export function formatHandMatrixWeight(weightLbs: number | null): string {
  if (weightLbs == null || !Number.isFinite(weightLbs) || weightLbs <= 0) return "—";
  return `${weightLbs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} lbs`;
}

/** 1-box row uses the stored variant label. Other tiers keep the calculated pallet sizes. */
export function storedOneBoxDimensions(boxes: number, dimensions: unknown): string | null {
  if (Math.floor(Number(boxes) || 0) !== 1) return null;
  const text = String(dimensions ?? "").trim();
  return text || null;
}

export function formatHandMatrixDimensions(unit: {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}): string {
  const height = unit.heightIn.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatInches(unit.widthIn)}" W x ${formatInches(unit.lengthIn)}" L x ${height}" H`;
}
