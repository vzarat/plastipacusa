import { FREE_LOCAL_DELIVERY_MIN_ROLLS, WARP_ORIGIN_ZIP } from "@/lib/shipping/config";
import { isRioGrandeValley } from "@/lib/shipping-method";
import { buildShipmentFreight, ShipmentDataError } from "@/lib/shipping/shipment";
import type { ShippingQuoteLine } from "@/lib/shipping/types";
import { quoteWarpFreight } from "@/lib/shipping/warp";
import type { ShipmentFreight, ShippingOption } from "@/lib/shipping/types";

const CACHE_MS = 10 * 60 * 1000;

interface CachedQuote {
  options: ShippingOption[];
  freight: ShipmentFreight;
  destinationZip: string;
  storedAt: number;
}

const responseCache = new Map<string, CachedQuote>();
const quotesById = new Map<string, ShippingOption & { freight: ShipmentFreight; storedAt: number }>();

export function freightCacheKey(zip: string, freight: ShipmentFreight): string {
  return [
    zip,
    freight.palletCount,
    freight.weightLbs,
    freight.lengthIn,
    freight.widthIn,
    freight.heightIn,
    "none",
  ].join("|");
}

function remember(zip: string, freight: ShipmentFreight, options: ShippingOption[]) {
  const key = freightCacheKey(zip, freight);
  responseCache.set(key, { options, freight, destinationZip: zip, storedAt: Date.now() });
  for (const option of options) {
    quotesById.set(option.id, { ...option, freight, storedAt: Date.now() });
  }
}

export async function getCachedWarpOptions(
  zip: string,
  freight: ShipmentFreight
): Promise<ShippingOption[]> {
  const key = freightCacheKey(zip, freight);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.storedAt < CACHE_MS) {
    const live = cached.options.filter(
      (option) => !option.expiresAt || Date.parse(option.expiresAt) > Date.now()
    );
    if (live.length > 0 && live.length === cached.options.length) return live;
  }
  if (WARP_ORIGIN_ZIP === "00000" || WARP_ORIGIN_ZIP === "TODO") {
    throw new Error("origin_missing");
  }
  const options = await quoteWarpFreight({
    originZip: WARP_ORIGIN_ZIP,
    destinationZip: zip,
    freight,
  });
  remember(zip, freight, options);
  return options;
}

export function readStoredQuote(
  quoteId: string,
  zip: string,
  freight: ShipmentFreight
): ShippingOption | null {
  const stored = quotesById.get(quoteId);
  if (!stored) return null;
  if (stored.destinationZip !== zip) return null;
  if (stored.freight.weightLbs !== freight.weightLbs) return null;
  if (stored.freight.palletCount !== freight.palletCount) return null;
  if (stored.expiresAt && Date.parse(stored.expiresAt) <= Date.now()) return null;
  return stored;
}

export async function resolveShippingCharge(input: {
  quoteId: string;
  postalCode: string;
  city?: string;
  state?: string;
  lines: ShippingQuoteLine[];
}): Promise<{ option: ShippingOption } | { error: string; expired: boolean }> {
  const zip = String(input.postalCode || "").match(/\d{5}/)?.[0];
  if (!zip) return { error: "Enter a valid ZIP code before payment.", expired: false };
  let freight;
  try {
    freight = await buildShipmentFreight(input.lines);
  } catch (error) {
    if (
      input.quoteId === "rgv-local" &&
      error instanceof ShipmentDataError &&
      error.code === "missing_dims" &&
      isRioGrandeValley({ postalCode: zip, city: input.city, state: input.state }) &&
      error.rolls >= FREE_LOCAL_DELIVERY_MIN_ROLLS
    ) {
      return {
        option: {
          id: "rgv-local",
          provider: "plastipac",
          mode: "local",
          serviceName: "Free Local RGV Delivery (Included)",
          description: "Included for Rio Grande Valley orders of 16 boxes (64 rolls) or more.",
          price: 0,
          transitDays: 1,
          expiresAt: null,
          destinationZip: zip,
        },
      };
    }
    return {
      error: "We couldn't confirm this shipping quote. Please choose it again.",
      expired: false,
    };
  }
  if (input.quoteId === "rgv-local") {
    const eligible =
      isRioGrandeValley({ postalCode: zip, city: input.city, state: input.state }) &&
      freight.rolls >= FREE_LOCAL_DELIVERY_MIN_ROLLS;
    if (!eligible) {
      return { error: "Free local delivery does not apply to this order.", expired: false };
    }
    return {
      option: {
        id: "rgv-local",
        provider: "plastipac",
        mode: "local",
        serviceName: "Free Local RGV Delivery (Included)",
        description: "Included for Rio Grande Valley orders of 16 boxes (64 rolls) or more.",
        price: 0,
        transitDays: 1,
        expiresAt: null,
        destinationZip: zip,
      },
    };
  }

  const stored = readStoredQuote(input.quoteId, zip, freight);
  if (stored) return { option: stored };

  const fresh = await getCachedWarpOptions(zip, freight);
  const match = fresh.find((option) => option.id === input.quoteId);
  if (match) return { option: match };
  return {
    error: "This shipping quote expired. Review the updated price before paying.",
    expired: true,
  };
}
