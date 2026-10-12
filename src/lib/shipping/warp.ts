import { SHIPPING_MARKUP_PERCENT, getWarpConfig } from "@/lib/shipping/config";
import { redactSecrets } from "@/lib/shipping/diagnostics";
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
        ).map((piece) => {
          const quantity = Math.max(1, wholeNumber(piece.quantity));
          const lineWeight = finiteNumber(piece.weightLbs);
          const totalWeight =
            quantity > 1 ? Math.round((lineWeight / quantity) * 10) / 10 : lineWeight;
          return {
            name: "Stretch film",
            length: finiteNumber(piece.lengthIn),
            width: finiteNumber(piece.widthIn),
            height: finiteNumber(piece.heightIn),
            sizeUnit: "IN",
            totalWeight,
            weightUnit: "lbs",
            quantity,
            packaging: piece.packaging,
            stackable: false,
          };
        }),
      }),
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

export async function quoteWarpFreight(input: {
  originZip: string;
  destinationZip: string;
  freight: ShipmentFreight;
}): Promise<ShippingOption[]> {
  const { baseUrl, apiKey } = getWarpConfig();
  const attempts = await Promise.all(
    VEHICLES.map(async (vehicle) => {
      try {
        const option = await quoteVehicle({
          baseUrl,
          apiKey,
          originZip: input.originZip,
          destinationZip: input.destinationZip,
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
