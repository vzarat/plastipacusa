import { formatPackageWeightLbs, formatPalletizedWeight, HAND_WOODEN_PALLET_LBS } from "@/lib/package-weight";

/** One layer of 16 hand-film boxes on a 48 x 48 deck. Height follows 78 / 4 and 39 / 2. */
const HAND_LAYER_HEIGHT_IN = 19.5;
const HAND_BOX_EDGE_IN = 11;

export const HAND_FREIGHT_DIMENSIONS_IN = {
  loose: { lengthIn: HAND_BOX_EDGE_IN, widthIn: HAND_BOX_EDGE_IN, heightIn: HAND_LAYER_HEIGHT_IN },
  layer: { lengthIn: 48, widthIn: 48, heightIn: HAND_LAYER_HEIGHT_IN },
  half: { lengthIn: 48, widthIn: 48, heightIn: 39 },
  full: { lengthIn: 48, widthIn: 48, heightIn: 78 },
} as const;

export type HandFreightTier = keyof typeof HAND_FREIGHT_DIMENSIONS_IN;

export function handFreightTier(boxes: number): HandFreightTier {
  if (boxes >= 64) return "full";
  if (boxes >= 32) return "half";
  if (boxes >= 16) return "layer";
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

export function handHandlingUnit(boxes: number): HandlingUnit {
  const count = Math.max(0, boxes);
  if (count >= 64) {
    return {
      lengthIn: 48,
      widthIn: 48,
      heightIn: 78,
      quantity: Math.ceil(count / 64),
      includesPalletTare: true,
      packaging: "pallet",
    };
  }
  if (count >= 32) {
    return {
      lengthIn: 48,
      widthIn: 48,
      heightIn: 39,
      quantity: 1,
      includesPalletTare: true,
      packaging: "pallet",
    };
  }
  if (count >= 16) {
    const layers = Math.ceil(count / 16);
    return {
      lengthIn: 48,
      widthIn: 48,
      heightIn: roundInches(HAND_LAYER_HEIGHT_IN * layers),
      quantity: 1,
      includesPalletTare: false,
      packaging: "box",
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

/** Machine stretch film. Footprint and stack are not the hand 48 x 48 pallet. */
const MACHINE_PALLET_DECK_IN = 6;

export function machineHandlingUnit(rolls: number, widthInches: number): HandlingUnit {
  const layers = rolls >= 40 ? 2 : 1;
  const rollWidth = widthInches > 0 ? widthInches : 20;
  return {
    lengthIn: 48,
    widthIn: 40,
    heightIn: roundInches(layers * rollWidth + MACHINE_PALLET_DECK_IN),
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

/** 15 in film ships in a shorter carton. 18 in film uses the taller carton. */
export function handBoxHeightIn(widthInches: number | null | undefined): number {
  const width = Number(widthInches);
  if (Number.isFinite(width) && width > 0 && width < 17) return 16.5;
  return 19.5;
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

/** 16, 32, and 64 boxes include one wooden pallet. A single box does not. */
export function handPalletTierWeightLbs(boxes: number, boxWeightLbs: number): number {
  return roundLbs(boxWeightLbs * boxes + HAND_WOODEN_PALLET_LBS);
}

/**
 * Warp handling units for a hand-film box count.
 * Under 16 boxes stay individual cartons. Larger counts are quarter, half, and full pallets.
 */
export function warpHandPieces(input: {
  boxes: number;
  widthInches?: number | null;
  boxWeightLbs: number | null;
  palletWeightLbs: number | null;
}): WarpHandPiece[] | null {
  const boxes = Math.max(0, Math.floor(Number(input.boxes) || 0));
  if (boxes < 1) return null;
  const boxWeight = Number(input.boxWeightLbs);
  const palletWeight = Number(input.palletWeightLbs);
  const boxOk = Number.isFinite(boxWeight) && boxWeight > 0;
  const palletOk = Number.isFinite(palletWeight) && palletWeight > 0;
  const palletTierWeight = (count: number): number | null => {
    if (count >= 64 && palletOk) return roundLbs(palletWeight);
    if (boxOk) return handPalletTierWeightLbs(count, boxWeight);
    return null;
  };
  const pieces: WarpHandPiece[] = [];
  let left = boxes;
  const fullCount = Math.floor(left / 64);
  if (fullCount > 0) {
    const each = palletTierWeight(64);
    if (each == null) return null;
    pieces.push({
      lengthIn: 48,
      widthIn: 48,
      heightIn: 78,
      weightLbs: roundLbs(each * fullCount),
      quantity: fullCount,
      packaging: "pallet",
    });
    left -= fullCount * 64;
  }
  if (left >= 32) {
    const weightLbs = palletTierWeight(32);
    if (weightLbs == null) return null;
    pieces.push({
      lengthIn: 48,
      widthIn: 48,
      heightIn: 39,
      weightLbs,
      quantity: 1,
      packaging: "pallet",
    });
    left -= 32;
  }
  if (left >= 16) {
    const weightLbs = palletTierWeight(16);
    if (weightLbs == null) return null;
    pieces.push({
      lengthIn: 48,
      widthIn: 48,
      heightIn: 29.5,
      weightLbs,
      quantity: 1,
      packaging: "pallet",
    });
    left -= 16;
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

/** Deck added under the 16-box and 32-box stacks on the product specs matrix. */
export const HAND_MATRIX_PALLET_BASE_IN = 10;

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

/**
 * Specs-table sizes. One box stays a carton. Pallet tiers add a 10 in deck.
 * The 64-box height is products.pallet_dimensions when that text is set.
 */
export function handMatrixDimensions(
  boxes: number,
  palletDimensions?: string | null,
  widthInches?: number | null
): { lengthIn: number; widthIn: number; heightIn: number } {
  const count = Math.max(0, Math.floor(Number(boxes) || 0));
  if (count >= 64) {
    return parseStoredPalletInches(palletDimensions) ?? { lengthIn: 48, widthIn: 48, heightIn: 78 };
  }
  if (count >= 32) {
    return { lengthIn: 48, widthIn: 48, heightIn: roundInches(39 + HAND_MATRIX_PALLET_BASE_IN) };
  }
  if (count >= 16) {
    return { lengthIn: 48, widthIn: 48, heightIn: roundInches(HAND_LAYER_HEIGHT_IN + HAND_MATRIX_PALLET_BASE_IN) };
  }
  return { lengthIn: HAND_BOX_EDGE_IN, widthIn: HAND_BOX_EDGE_IN, heightIn: handBoxHeightIn(widthInches) };
}

/** 1 box is box_weight_lbs. 16, 32, and 64 boxes add one 29.18 lb wooden pallet. */
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
  if (count >= 64) {
    if (palletOk) return Math.round(pallet * 100) / 100;
    if (boxOk) return handPalletTierWeightLbs(64, box);
    return null;
  }
  if (count >= 32) return boxOk ? handPalletTierWeightLbs(32, box) : null;
  if (count >= 16) return boxOk ? handPalletTierWeightLbs(16, box) : null;
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
