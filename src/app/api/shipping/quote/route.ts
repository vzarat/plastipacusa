import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { FREE_LOCAL_DELIVERY_MIN_ROLLS } from "@/lib/shipping/config";
import { buildQuoteFailure, shippingRequestId } from "@/lib/shipping/diagnostics";
import { isRioGrandeValley } from "@/lib/shipping-method";
import { getCachedWarpOptions } from "@/lib/shipping/quote-cache";
import { ShipmentDataError, buildShipmentFreight } from "@/lib/shipping/shipment";
import { WarpQuoteError } from "@/lib/shipping/warp";
import type {
  ShipmentFreight,
  ShippingOption,
  ShippingQuoteErrorCode,
  ShippingQuoteLine,
} from "@/lib/shipping/types";

export const runtime = "nodejs";

function zipCode(value: unknown): string | null {
  const match = String(value || "").match(/\d{5}/);
  return match ? match[0] : null;
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
    const freeLocal =
      isRioGrandeValley({
        postalCode: zip,
        city: body.city,
        state: body.state,
      }) && freight.rolls >= FREE_LOCAL_DELIVERY_MIN_ROLLS
        ? freeLocalOption(zip)
        : null;

    try {
      const options = await getCachedWarpOptions(zip, freight);
      if (options.length === 0) {
        return failureJson({
          error: null,
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
        options,
        message: null,
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
      isRioGrandeValley({
        postalCode: zip,
        city: body.city,
        state: body.state,
      }) &&
      error.rolls >= FREE_LOCAL_DELIVERY_MIN_ROLLS
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
