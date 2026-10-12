import { SHIPPING_MARKUP_PERCENT, getWarpConfig } from "@/lib/shipping/config";
import type { ShipmentFreight, ShippingOption } from "@/lib/shipping/types";

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
    readonly code: "timeout" | "rate_limit" | "unavailable" | "invalid_zip"
  ) {
    super(code);
  }
}

function nextPickupDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}

function applyMarkup(amount: number): number {
  const marked = amount * (1 + SHIPPING_MARKUP_PERCENT / 100);
  return Math.round(marked * 100) / 100;
}

async function quoteVehicle(input: {
  baseUrl: string;
  apiKey: string;
  originZip: string;
  destinationZip: string;
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
      body: JSON.stringify({
        pickupDate: nextPickupDate(),
        pickupInfo: { zipcode: input.originZip },
        deliveryInfo: { zipcode: input.destinationZip },
        shipmentType: input.vehicle.shipmentType,
        vehicleType: { code: input.vehicle.code },
        listItems: (input.freight.pieces?.length
          ? input.freight.pieces
          : [
              {
                lengthIn: input.freight.lengthIn,
                widthIn: input.freight.widthIn,
                heightIn: input.freight.heightIn,
                weightLbs: input.freight.weightLbs,
                quantity: input.freight.palletCount,
                packaging: "pallet" as const,
              },
            ]
        ).map((piece) => ({
          name: "Stretch film",
          length: piece.lengthIn,
          width: piece.widthIn,
          height: piece.heightIn,
          sizeUnit: "IN",
          totalWeight:
            piece.quantity > 1
              ? Math.round((piece.weightLbs / piece.quantity) * 10) / 10
              : piece.weightLbs,
          weightUnit: "lbs",
          quantity: piece.quantity,
          packaging: piece.packaging,
          stackable: false,
        })),
      }),
    });

    if (response.status === 429) throw new WarpQuoteError("rate_limit");
    if (response.status === 400) return null;
    if (!response.ok) throw new WarpQuoteError("unavailable");

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
      throw new WarpQuoteError("timeout");
    }
    throw new WarpQuoteError("unavailable");
  } finally {
    clearTimeout(timer);
  }
}

export async function quoteWarpFreight(input: {
  originZip: string;
  destinationZip: string;
  freight: ShipmentFreight;
}): Promise<ShippingOption[]> {
  const { baseUrl, apiKey } = getWarpConfig();
  const results = await Promise.all(
    VEHICLES.map((vehicle) =>
      quoteVehicle({
        baseUrl,
        apiKey,
        originZip: input.originZip,
        destinationZip: input.destinationZip,
        freight: input.freight,
        vehicle,
      }).catch((error: unknown) => {
        if (error instanceof WarpQuoteError && error.code !== "unavailable") throw error;
        return null;
      })
    )
  );
  return results.filter((option): option is ShippingOption => option != null);
}
