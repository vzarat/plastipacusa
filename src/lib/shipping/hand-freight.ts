import { formatPackageWeightLbs, formatPalletizedWeight } from "@/lib/package-weight";

/** One layer of 16 hand-film boxes on a 48 x 48 deck. Height follows 78 / 4 and 39 / 2. */
const HAND_LAYER_HEIGHT_IN = 19.5;
const HAND_BOX_EDGE_IN = 12;

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
