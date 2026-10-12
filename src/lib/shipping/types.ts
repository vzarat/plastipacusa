export interface ShippingQuoteLine {
  sku?: string;
  productSlug?: string;
  quantity: number;
  totalBoxes?: number;
  totalRolls?: number;
  application?: string;
}

export interface ShippingOption {
  id: string;
  provider: "warp" | "plastipac";
  mode: "LTL" | "truckload" | "local";
  serviceName: string;
  description: string;
  price: number;
  transitDays: number;
  expiresAt: string | null;
  destinationZip: string;
}

export interface FreightPiece {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightLbs: number;
  quantity: number;
  packaging: "pallet" | "box";
  dimensionLabel: string;
  weightLabel: string;
}

export interface ShipmentFreight {
  weightLbs: number;
  palletCount: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  rolls: number;
  boxes: number;
  pieces: FreightPiece[];
}

export type ShippingQuoteErrorCode =
  | "invalid_zip"
  | "missing_weight"
  | "missing_dims"
  | "timeout"
  | "rate_limit"
  | "unavailable"
  | "no_options";
