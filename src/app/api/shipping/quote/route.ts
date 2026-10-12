import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { FREE_LOCAL_DELIVERY_MIN_ROLLS } from "@/lib/shipping/config";
import { isRioGrandeValley } from "@/lib/shipping-method";
import { getCachedWarpOptions } from "@/lib/shipping/quote-cache";
import { ShipmentDataError, buildShipmentFreight } from "@/lib/shipping/shipment";
import { WarpQuoteError } from "@/lib/shipping/warp";
import type { ShippingOption, ShippingQuoteLine } from "@/lib/shipping/types";

export const runtime = "nodejs";

function zipCode(value: unknown): string | null {
  const match = String(value || "").match(/\d{5}/);
  return match ? match[0] : null;
}

function publicMessage(code: string): string {
  if (code === "invalid_zip") return "Enter a valid 5-digit ZIP code to see shipping options.";
  if (code === "missing_weight") {
    return "We couldn't calculate shipping automatically because product weight is missing.";
  }
  if (code === "missing_dims") {
    return "We couldn't calculate shipping automatically because pallet dimensions are missing.";
  }
  if (code === "timeout") return "The shipping quote took too long. Please try again.";
  if (code === "rate_limit") return "Shipping quotes are busy right now. Please try again in a moment.";
  if (code === "origin_missing") {
    return "We couldn't calculate shipping automatically.";
  }
  return "We couldn't calculate shipping automatically.";
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
      return NextResponse.json(
        { ok: false, code: "invalid_zip", message: publicMessage("invalid_zip") },
        { status: 400 }
      );
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
      return NextResponse.json({
        ok: true,
        weightLbs: freight.weightLbs,
        palletCount: freight.palletCount,
        freeLocal,
        options,
        message: options.length === 0 && !freeLocal ? publicMessage("no_options") : null,
      });
    } catch (error) {
      const code =
        error instanceof WarpQuoteError
          ? error.code
          : error instanceof Error && error.message === "origin_missing"
            ? "origin_missing"
            : "unavailable";
      console.error("shipping quote failed", code);
      if (freeLocal) {
        return NextResponse.json({
          ok: true,
          weightLbs: freight.weightLbs,
          palletCount: freight.palletCount,
          freeLocal,
          options: [],
          message: publicMessage(code),
        });
      }
      return NextResponse.json(
        { ok: false, code, message: publicMessage(code), weightLbs: freight.weightLbs },
        { status: code === "rate_limit" ? 429 : 502 }
      );
    }
  } catch (error) {
    if (error instanceof ShipmentDataError && error.code === "missing_dims" && zip) {
      const freeLocal =
        isRioGrandeValley({
          postalCode: zip,
          city: body.city,
          state: body.state,
        }) && error.rolls >= FREE_LOCAL_DELIVERY_MIN_ROLLS
          ? freeLocalOption(zip)
          : null;
      if (freeLocal) {
        return NextResponse.json({
          ok: true,
          weightLbs: error.weightLbs,
          palletCount: 1,
          freeLocal,
          options: [],
          message: publicMessage("missing_dims"),
        });
      }
      return NextResponse.json(
        {
          ok: false,
          code: error.code,
          message: publicMessage(error.code),
          weightLbs: error.weightLbs,
        },
        { status: 422 }
      );
    }
    if (error instanceof ShipmentDataError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: publicMessage(error.code) },
        { status: 422 }
      );
    }
    console.error("shipping quote failed");
    return NextResponse.json(
      { ok: false, code: "unavailable", message: publicMessage("unavailable") },
      { status: 500 }
    );
  }
}
