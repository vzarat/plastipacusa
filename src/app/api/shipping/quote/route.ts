import { NextResponse } from "next/server";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { WARP_ORIGIN_ZIP, getWarpConfig } from "@/lib/shipping/config";
import { buildQuoteFailure, shippingRequestId } from "@/lib/shipping/diagnostics";
import { freeRgvDelivery } from "@/lib/shipping/rgv-delivery";
import { evalShippingEligibility } from "@/lib/shippingRules";
import {
  fetchLtlMarketOptions,
  marketItemsFromPieces,
  type MarketOptionQuote,
} from "@/lib/shipping/market-options";
import { getCachedWarpOptions, safeStoreLog, storeQuotedOptions } from "@/lib/shipping/quote-cache";
import { ShipmentDataError, buildShipmentFreight } from "@/lib/shipping/shipment";
import { WarpQuoteError } from "@/lib/shipping/warp";
import {
  SHIPPING_QUOTE_BURST_LIMIT,
  SHIPPING_QUOTE_BURST_SECONDS,
  SHIPPING_QUOTE_DAILY_LIMIT,
  clientIpFromHeaders,
  hashClientIp,
  withQuoteRateLimit,
  type QuoteLimitStatus,
} from "@/lib/shipping/quote-rate";
import type {
  ShipmentFreight,
  ShippingOption,
  ShippingQuoteErrorCode,
  ShippingQuoteLine,
} from "@/lib/shipping/types";

export const runtime = "nodejs";
/** Hobby maximum. The checkout page still says rates can take up to 30 seconds. */
export const maxDuration = 300;

const LTL_LIMIT_MESSAGE =
  "This shipment is too large for LTL. Showing truckload options instead.";

function nextWeekday(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function serviceDescription(level: string): string {
  if (level === "GUARANTEED") return "Guaranteed freight service.";
  if (level === "ECONOMY") return "Economy freight service.";
  if (level === "PRIORITY") return "Priority freight service.";
  if (level === "STANDARD") return "Standard freight service.";
  return "Freight service.";
}

function carrierOption(option: MarketOptionQuote, zip: string): ShippingOption {
  const truckload = /FTL|TRUCKLOAD/.test(option.serviceLevel.toUpperCase());
  return {
    id: option.quoteId,
    provider: "warp",
    mode: truckload ? "truckload" : "LTL",
    serviceName: option.carrierName || option.serviceLevel,
    description: serviceDescription(option.serviceLevel),
    price: option.price,
    transitDays: option.transitDays && option.transitDays > 0 ? option.transitDays : 1,
    expiresAt: option.expiresAt || null,
    destinationZip: zip,
    carrierName: option.carrierName || undefined,
    carrierKey: option.carrierKey,
    serviceLevel: option.serviceLevel,
  };
}

function zipCode(value: unknown): string | null {
  const match = String(value || "").match(/\d{5}/);
  return match ? match[0] : null;
}

function houstonFridayOption(zip: string, label: string): ShippingOption {
  return {
    id: "houston-friday",
    provider: "plastipac",
    mode: "local",
    serviceName: label,
    description: "Direct dock delivery on the Houston corridor route.",
    price: 0,
    transitDays: 1,
    expiresAt: null,
    destinationZip: zip,
  };
}

function freeLocalOption(zip: string): ShippingOption {
  return {
    id: "rgv-local",
    provider: "plastipac",
    mode: "local",
    serviceName: "Free Local RGV Delivery (Included)",
    description: "Included for Rio Grande Valley orders of 16 boxes (64 rolls) or more.",
    price: 0,
    transitDays: 1,
    expiresAt: null,
    destinationZip: zip,
  };
}

function classifyFailure(error: unknown): {
  code: ShippingQuoteErrorCode;
  httpStatus?: number;
  providerMessage?: string;
} {
  if (error instanceof WarpQuoteError) {
    if (error.code === "timeout") {
      return { code: "WARP_TIMEOUT", providerMessage: error.detail };
    }
    if (error.status === 401 || error.status === 403) {
      return { code: "WARP_AUTH", httpStatus: error.status, providerMessage: error.detail };
    }
    return {
      code: "WARP_HTTP_ERROR",
      httpStatus: error.status,
      providerMessage: error.detail,
    };
  }
  if (error instanceof ShipmentDataError) {
    return {
      code: error.code === "missing_dims" ? "MISSING_DIMS" : "VALIDATION",
      providerMessage: error.message,
    };
  }
  if (error instanceof Error && /Missing or invalid:|WARP_ENV|WARP_API_KEY/.test(error.message)) {
    return { code: "CONFIG", providerMessage: error.message };
  }
  if (error instanceof Error) {
    return { code: "UNKNOWN", providerMessage: error.message };
  }
  return { code: "UNKNOWN" };
}

function failureJson(input: {
  error: unknown;
  code?: ShippingQuoteErrorCode;
  freight: ShipmentFreight | null;
  zip: string | null;
  city?: string | null;
  state?: string | null;
  freeLocal?: ShippingOption | null;
  status?: number;
}) {
  const classified = input.code
    ? { code: input.code, providerMessage: undefined, httpStatus: undefined }
    : classifyFailure(input.error);
  const requestId = shippingRequestId();
  const failure = buildQuoteFailure({
    code: classified.code,
    requestId,
    httpStatus: classified.httpStatus,
    providerMessage: classified.providerMessage,
    freight: input.freight,
    destination: { zip: input.zip, city: input.city, state: input.state },
  });
  return NextResponse.json(
    {
      ok: false,
      fallback: "manual_quote",
      error: failure.error,
      ...(failure.debug ? { debug: failure.debug } : {}),
      message: failure.publicMessage,
      weightLbs: input.freight?.weightLbs ?? null,
      palletCount: input.freight?.palletCount ?? null,
      dimensions: input.freight?.pieces.map((piece) => piece.dimensionLabel) ?? [],
      weightDetail: input.freight?.pieces.map((piece) => piece.weightLabel) ?? [],
      freeLocal: input.freeLocal ?? null,
      options: [],
    },
    input.status ? { status: input.status } : undefined
  );
}

async function consumeShippingQuoteLimit(headers: Headers): Promise<QuoteLimitStatus> {
  if (!isServiceRoleConfigured()) return "unavailable";
  const admin = createServiceRoleClient();
  const { data, error } = await admin.rpc("consume_shipping_quote_limit", {
    p_ip_hash: hashClientIp(clientIpFromHeaders(headers)),
    p_burst_limit: SHIPPING_QUOTE_BURST_LIMIT,
    p_day_limit: SHIPPING_QUOTE_DAILY_LIMIT,
    p_burst_seconds: SHIPPING_QUOTE_BURST_SECONDS,
  });
  if (error || typeof data !== "boolean") return "unavailable";
  return data ? "allowed" : "blocked";
}

export async function POST(request: Request) {
  let body: {
    postalCode?: string;
    city?: string;
    state?: string;
    lines?: ShippingQuoteLine[];
  } = {};
  let zip: string | null = null;

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Sign in to calculate shipping." },
        { status: 401 }
      );
    }

    const limit = await consumeShippingQuoteLimit(request.headers);
    return withQuoteRateLimit(limit, async () => quoteForSignedInUser(request));
  } catch (error) {
    return failureJson({
      error,
      freight: null,
      zip,
      city: body.city,
      state: body.state,
      freeLocal: null,
      status: error instanceof ShipmentDataError ? 422 : undefined,
    });
  }
}

async function quoteForSignedInUser(request: Request) {
  let body: {
    postalCode?: string;
    city?: string;
    state?: string;
    lines?: ShippingQuoteLine[];
  } = {};
  let zip: string | null = null;

  try {
    body = (await request.json()) as typeof body;
    zip = zipCode(body.postalCode);
    if (!zip) {
      return failureJson({
        error: null,
        code: "INVALID_ZIP",
        freight: null,
        zip: null,
        city: body.city,
        state: body.state,
        status: 400,
      });
    }

    const freight = await buildShipmentFreight(body.lines || []);
    const freeLocal = freeRgvDelivery({
      postalCode: zip,
      city: body.city,
      state: body.state,
      rolls: freight.rolls,
    }).eligible
      ? freeLocalOption(zip)
      : null;
    const fridayRule = evalShippingEligibility(
      zip,
      body.city || "",
      body.state || "",
      freight.boxes,
      freight.rolls
    ).options.find((option) => option.id === "houston-friday");
    const fridayRoute = fridayRule ? houstonFridayOption(zip, fridayRule.label) : null;

    const destinationZip = zip;

    try {
      const [marketResult, warpResult] = await Promise.allSettled([
        (async () => {
          const config = getWarpConfig();
          return fetchLtlMarketOptions({
            apiKey: config.apiKey,
            originZip: WARP_ORIGIN_ZIP,
            destinationZip,
            pickupDate: nextWeekday(),
            items: marketItemsFromPieces(freight.pieces),
            timeoutMs: 45_000,
          });
        })(),
        getCachedWarpOptions(destinationZip, freight),
      ]);

      const warpOptions = warpResult.status === "fulfilled" ? warpResult.value : [];
      const truckload = warpOptions.filter((option) => option.mode === "truckload");
      const ltlFallback = warpOptions.filter((option) => option.mode === "LTL");
      const limitExceeded =
        marketResult.status === "fulfilled" && marketResult.value.limitExceeded;

      let carrierOptions: ShippingOption[] = [];
      if (!limitExceeded && marketResult.status === "fulfilled") {
        const visible = marketResult.value.options.map((option) =>
          carrierOption(option, destinationZip)
        );
        if (visible.length > 0) {
          try {
            carrierOptions = await storeQuotedOptions(destinationZip, freight, visible, "market");
          } catch (error) {
            safeStoreLog(error);
            carrierOptions = [];
          }
        }
      }

      const options = limitExceeded
        ? truckload
        : carrierOptions.length > 0
          ? [...carrierOptions, ...truckload]
          : [...ltlFallback, ...truckload];
      const offered = fridayRoute ? [fridayRoute, ...options] : options;

      if (offered.length === 0 && !freeLocal) {
        return failureJson({
          error: warpResult.status === "rejected" ? warpResult.reason : null,
          code: "NO_OPTIONS",
          freight,
          zip,
          city: body.city,
          state: body.state,
          freeLocal,
        });
      }
      return NextResponse.json({
        ok: true,
        weightLbs: freight.weightLbs,
        palletCount: freight.palletCount,
        dimensions: freight.pieces.map((piece) => piece.dimensionLabel),
        weightDetail: freight.pieces.map((piece) => piece.weightLabel),
        freeLocal,
        options: offered,
        message: limitExceeded ? LTL_LIMIT_MESSAGE : null,
      });
    } catch (error) {
      return failureJson({
        error,
        freight,
        zip,
        city: body.city,
        state: body.state,
        freeLocal,
      });
    }
  } catch (error) {
    const freeLocal =
      zip &&
      error instanceof ShipmentDataError &&
      freeRgvDelivery({
        postalCode: zip,
        city: body.city,
        state: body.state,
        rolls: error.rolls,
      }).eligible
        ? freeLocalOption(zip)
        : null;
    const freight =
      error instanceof ShipmentDataError
        ? ({
            weightLbs: error.weightLbs,
            palletCount: 0,
            lengthIn: 0,
            widthIn: 0,
            heightIn: 0,
            rolls: error.rolls,
            boxes: error.boxes,
            pieces: [],
          } satisfies ShipmentFreight)
        : null;
    return failureJson({
      error,
      freight,
      zip,
      city: body.city,
      state: body.state,
      freeLocal,
      status: error instanceof ShipmentDataError ? 422 : undefined,
    });
  }
}
