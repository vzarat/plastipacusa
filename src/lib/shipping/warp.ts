import { nextBusinessPickupDate } from "@/lib/shipping/dates";
import { SHIPPING_MARKUP_PERCENT, getWarpConfig } from "@/lib/shipping/config";
import { warpDeliveryInfo, warpPickupInfo, type WarpDestinationAddress } from "@/lib/shipping/origin";
import { redactSecrets } from "@/lib/shipping/diagnostics";
import type { FreightPiece, ShipmentFreight, ShippingOption } from "@/lib/shipping/types";

const QUOTE_TIMEOUT_MS = 12000;

const VEHICLES = [
  {
    shipmentType: "LTL",
    code: "DRY_VAN_53_LTL",
    mode: "LTL" as const,
    serviceName: "LTL",
    description: "Shared-truck freight for palletized film.",
  },
  {
    shipmentType: "FTL",
    code: "STRAIGHT_TRUCK_26",
    mode: "truckload" as const,
    serviceName: "26 ft straight truck",
    description: "Dedicated regional truck.",
  },
  {
    shipmentType: "FTL",
    code: "DRY_VAN_53",
    mode: "truckload" as const,
    serviceName: "53 ft dry van",
    description: "Dedicated full truckload.",
  },
];

export class WarpQuoteError extends Error {
  constructor(
    readonly code: "timeout" | "rate_limit" | "unavailable" | "invalid_zip" | "provider",
    readonly status?: number,
    readonly detail?: string
  ) {
    super(detail || code);
  }
}

function finiteNumber(value: unknown): number {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(amount) ? amount : 0;
}

function wholeNumber(value: unknown): number {
  const amount = parseInt(String(finiteNumber(value)), 10);
  return Number.isFinite(amount) ? amount : 0;
}

function warpProviderMessage(status: number, raw: string): string {
  let text = redactSecrets(raw.trim());
  try {
    const parsed = JSON.parse(raw) as { message?: unknown; error?: unknown; code?: unknown };
    const candidate = parsed.message ?? parsed.error ?? parsed.code;
    if (typeof candidate === "string" && candidate.trim()) text = redactSecrets(candidate.trim());
    else if (candidate != null) text = redactSecrets(JSON.stringify(candidate));
  } catch {
    text = redactSecrets(raw.trim());
  }
  return text.slice(0, 500) || "request rejected";
}

export function usesWarpParcel(freight: Pick<ShipmentFreight, "boxes" | "pieces">): boolean {
  const boxes = Math.floor(Number(freight.boxes) || 0);
  if (boxes < 1 || boxes >= 16) return false;
  if (freight.pieces.length === 0) return false;
  return freight.pieces.every((piece) => piece.packaging === "box");
}

/** Warp list item. Cartons use packaging "carton"; pallet tiers use "pallet". */
export function warpListItem(piece: FreightPiece): {
  name: string;
  length: number;
  width: number;
  height: number;
  sizeUnit: "IN";
  totalWeight: number;
  weightUnit: "lbs";
  quantity: number;
  packaging: "carton" | "pallet";
  stackable: false;
} {
  const quantity = Math.max(1, wholeNumber(piece.quantity));
  const lineWeight = finiteNumber(piece.weightLbs);
  const totalWeight = quantity > 1 ? Math.round((lineWeight / quantity) * 10) / 10 : lineWeight;
  return {
    name: "Stretch film",
    length: finiteNumber(piece.lengthIn),
    width: finiteNumber(piece.widthIn),
    height: finiteNumber(piece.heightIn),
    sizeUnit: "IN",
    totalWeight,
    weightUnit: "lbs",
    quantity,
    packaging: piece.packaging === "box" ? "carton" : "pallet",
    stackable: false,
  };
}

export function warpFreightQuoteBody(input: {
  pickupDate: string;
  originZip?: string;
  destinationZip: string;
  destination?: WarpDestinationAddress;
  freight: ShipmentFreight;
  shipmentType: "PARCEL" | "LTL" | "FTL";
  vehicleCode?: string;
}): Record<string, unknown> {
  const pieces = input.freight.pieces.length
    ? input.freight.pieces
    : [
        {
          lengthIn: input.freight.lengthIn,
          widthIn: input.freight.widthIn,
          heightIn: input.freight.heightIn,
          weightLbs: input.freight.weightLbs,
          quantity: input.freight.palletCount,
          packaging: "pallet" as const,
          dimensionLabel: "",
          weightLabel: "",
        },
      ];
  return {
    pickupDate: input.pickupDate,
    pickupInfo: warpPickupInfo(),
    deliveryInfo: warpDeliveryInfo(input.destinationZip, input.destination),
    shipmentType: input.shipmentType,
    ...(input.vehicleCode ? { vehicleType: { code: input.vehicleCode } } : {}),
    listItems: pieces.map((piece) => warpListItem(piece)),
  };
}

function applyMarkup(amount: number): number {
  const marked = amount * (1 + SHIPPING_MARKUP_PERCENT / 100);
  return Math.round(marked * 100) / 100;
}

async function quoteVehicle(input: {
  baseUrl: string;
  apiKey: string;
  destinationZip: string;
  destination?: WarpDestinationAddress;
  freight: ShipmentFreight;
  vehicle: (typeof VEHICLES)[number];
}): Promise<ShippingOption | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);
  try {
    const response = await fetch(`${input.baseUrl}/freights/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: input.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify(
        warpFreightQuoteBody({
          pickupDate: nextBusinessPickupDate(),
          destinationZip: input.destinationZip,
          destination: input.destination,
          freight: input.freight,
          shipmentType: input.vehicle.shipmentType as "LTL" | "FTL",
          vehicleCode: input.vehicle.code,
        })
      ),
    });

    if (response.status === 401 || response.status === 403) {
      const raw = await response.text();
      throw new WarpQuoteError("provider", response.status, warpProviderMessage(response.status, raw));
    }
    if (response.status === 429) {
      throw new WarpQuoteError("rate_limit", 429, "rate limit");
    }
    if (!response.ok) {
      const raw = await response.text();
      throw new WarpQuoteError("provider", response.status, warpProviderMessage(response.status, raw));
    }

    const body = (await response.json()) as {
      quote_id?: string;
      price?: { amount?: number };
      transit_time?: number;
      expiration_time_utc?: number;
      status?: string;
    };
    if (body.status && body.status !== "ACCEPT") {
      throw new WarpQuoteError("provider", response.status, body.status);
    }
    const amount = Number(body.price?.amount);
    const quoteId = String(body.quote_id || "");
    if (!quoteId || !Number.isFinite(amount) || amount <= 0) return null;

    const expiresAt =
      body.expiration_time_utc && Number(body.expiration_time_utc) > 0
        ? new Date(Number(body.expiration_time_utc) * 1000).toISOString()
        : new Date(Date.now() + 10 * 60 * 1000).toISOString();

    return {
      id: quoteId,
      provider: "warp",
      mode: input.vehicle.mode,
      serviceName: input.vehicle.serviceName,
      description: input.vehicle.description,
      price: applyMarkup(amount),
      transitDays: Math.max(1, Math.round(Number(body.transit_time) || 1)),
      expiresAt,
      destinationZip: input.destinationZip,
    };
  } catch (error) {
    if (error instanceof WarpQuoteError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new WarpQuoteError("timeout", undefined, "timeout");
    }
    const detail = error instanceof Error ? redactSecrets(error.message) : "request failed";
    throw new WarpQuoteError("unavailable", undefined, detail);
  } finally {
    clearTimeout(timer);
  }
}

/** One Warp quote with shipmentType PARCEL and one carton per box. */
export async function quoteWarpParcel(input: {
  originZip?: string;
  destinationZip: string;
  destination?: WarpDestinationAddress;
  freight: ShipmentFreight;
}): Promise<ShippingOption | null> {
  const { baseUrl, apiKey } = getWarpConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), QUOTE_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/freights/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify(
        warpFreightQuoteBody({
          pickupDate: nextBusinessPickupDate(),
          destinationZip: input.destinationZip,
          destination: input.destination,
          freight: input.freight,
          shipmentType: "PARCEL",
        })
      ),
    });
    if (response.status === 401 || response.status === 403) {
      const raw = await response.text();
      throw new WarpQuoteError("provider", response.status, warpProviderMessage(response.status, raw));
    }
    if (!response.ok) {
      await response.text();
      return null;
    }
    const body = (await response.json()) as {
      quote_id?: string;
      price?: { amount?: number };
      transit_time?: number;
      expiration_time_utc?: number;
      status?: string;
    };
    if (body.status && body.status !== "ACCEPT") return null;
    const amount = Number(body.price?.amount);
    const quoteId = String(body.quote_id || "");
    if (!quoteId || !Number.isFinite(amount) || amount <= 0) return null;
    const expiresAt =
      body.expiration_time_utc && Number(body.expiration_time_utc) > 0
        ? new Date(Number(body.expiration_time_utc) * 1000).toISOString()
        : new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return {
      id: quoteId,
      provider: "warp",
      mode: "parcel",
      serviceName: "Parcel",
      description: "Small parcel shipment for individual cartons.",
      price: applyMarkup(amount),
      carrierPrice: amount,
      transitDays: Math.max(1, Math.round(Number(body.transit_time) || 3)),
      expiresAt,
      destinationZip: input.destinationZip,
      carrierName: "Warp",
      carrierKey: "warp",
      serviceLevel: "PARCEL",
    };
  } catch (error) {
    if (error instanceof WarpQuoteError) throw error;
    if (error instanceof Error && error.name === "AbortError") return null;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function quoteWarpFreight(input: {
  originZip?: string;
  destinationZip: string;
  destination?: WarpDestinationAddress;
  freight: ShipmentFreight;
}): Promise<ShippingOption[]> {
  const { baseUrl, apiKey } = getWarpConfig();
  const attempts = await Promise.all(
    VEHICLES.map(async (vehicle) => {
      try {
        const option = await quoteVehicle({
          baseUrl,
          apiKey,
          destinationZip: input.destinationZip,
          destination: input.destination,
          freight: input.freight,
          vehicle,
        });
        return { option, error: null as WarpQuoteError | null };
      } catch (error) {
        const failure =
          error instanceof WarpQuoteError
            ? error
            : new WarpQuoteError("unavailable", undefined, "Warp request failed");
        return { option: null as ShippingOption | null, error: failure };
      }
    })
  );
  const options = attempts
    .map((attempt) => attempt.option)
    .filter((option): option is ShippingOption => option != null);
  if (options.length > 0) return options;
  const failures = attempts
    .map((attempt, index) => {
      if (!attempt.error) return null;
      const status = attempt.error.status ? `HTTP ${attempt.error.status}` : attempt.error.code;
      const detail = attempt.error.detail || attempt.error.message;
      return `${VEHICLES[index].code} ${status}: ${detail}`;
    })
    .filter((line): line is string => Boolean(line));
  const failure = attempts.find((attempt) => attempt.error)?.error;
  if (failure) {
    throw new WarpQuoteError(
      failure.code,
      failure.status,
      redactSecrets(failures.join(" | ") || failure.detail || failure.message)
    );
  }
  return [];
}

const PROBE_PIECE: FreightPiece = {
  lengthIn: 48,
  widthIn: 48,
  heightIn: 48,
  weightLbs: 100,
  quantity: 1,
  packaging: "pallet",
  dimensionLabel: "48 x 48 x 48 in",
  weightLabel: "100 lbs",
};

const PROBE_FREIGHT: ShipmentFreight = {
  weightLbs: PROBE_PIECE.weightLbs,
  palletCount: 1,
  lengthIn: PROBE_PIECE.lengthIn,
  widthIn: PROBE_PIECE.widthIn,
  heightIn: PROBE_PIECE.heightIn,
  rolls: 0,
  boxes: 0,
  pieces: [PROBE_PIECE],
};

/**
 * One LTL quote for the admin connection check.
 * Uses the same endpoint, headers, and item fields as quoteVehicle.
 */
export async function probeWarpConnection(
  timeoutMs: number,
  config: { baseUrl: string; apiKey: string }
): Promise<{ httpStatus: number; bodyText: string }> {
  const vehicle = VEHICLES[0];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/freights/quote`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: config.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        pickupDate: nextBusinessPickupDate(),
        pickupInfo: warpPickupInfo(),
        deliveryInfo: warpDeliveryInfo("77002"),
        shipmentType: vehicle.shipmentType,
        vehicleType: { code: vehicle.code },
        listItems: [
          {
            name: "Stretch film",
            length: PROBE_PIECE.lengthIn,
            width: PROBE_PIECE.widthIn,
            height: PROBE_PIECE.heightIn,
            sizeUnit: "IN",
            totalWeight: PROBE_FREIGHT.weightLbs,
            weightUnit: "lbs",
            quantity: PROBE_PIECE.quantity,
            packaging: PROBE_PIECE.packaging,
            stackable: false,
          },
        ],
      }),
    });
    return { httpStatus: response.status, bodyText: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}
