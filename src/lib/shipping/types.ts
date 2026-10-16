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
  carrierName?: string;
  carrierKey?: string;
  serviceLevel?: string;
  /** Warp amount before SHIPPING_MARKUP_PERCENT. Customer price stays on `price`. */
  carrierPrice?: number;
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
  | "MISSING_DIMS"
  | "MISSING_WEIGHT"
  | "WARP_AUTH"
  | "WARP_HTTP_ERROR"
  | "WARP_TIMEOUT"
  | "INVALID_ZIP"
  | "NO_OPTIONS"
  | "VALIDATION"
  | "CONFIG"
  | "UNKNOWN";

export interface ShippingQuoteErrorBody {
  code: ShippingQuoteErrorCode;
  message?: string;
  httpStatus?: number;
  providerMessage?: string;
  requestId: string;
}

export interface ShippingQuoteDebug {
  environment: "staging" | "production" | "unset";
  endpoint: string;
  requestSummary: {
    originZip: string;
    destinationZip: string | null;
    city: string | null;
    state: string | null;
    pallets: number;
    weightLbs: number;
    boxes: number;
    rolls: number;
    pieces: Array<{
      length: number;
      width: number;
      height: number;
      weightLbs: number;
      quantity: number;
      packaging: string;
    }>;
  };
  missingFields: string[];
}
