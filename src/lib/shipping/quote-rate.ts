import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { redactSecrets, shippingRequestId } from "@/lib/shipping/diagnostics";
import type { ShippingQuoteErrorCode } from "@/lib/shipping/types";

/** Quotes allowed for one IP inside a 10-minute window. */
export const SHIPPING_QUOTE_BURST_LIMIT = 10;
/** Quotes allowed for one IP inside a UTC day. */
export const SHIPPING_QUOTE_DAILY_LIMIT = 60;
export const SHIPPING_QUOTE_BURST_SECONDS = 10 * 60;

export const QUOTE_RATE_LIMIT_MESSAGE = "Too many shipping quotes. Try again later.";

export function hashClientIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export type QuoteLimitStatus = "allowed" | "blocked" | "unavailable" | "unconfigured";

function limitFailure(code: ShippingQuoteErrorCode, message: string, status: number, detail?: string): Response {
  const requestId = shippingRequestId();
  console.error(
    JSON.stringify({
      source: "shipping-quote",
      requestId,
      code,
      message: redactSecrets(detail || message),
    })
  );
  return NextResponse.json(
    {
      ok: false,
      fallback: "manual_quote",
      message,
      requestId,
      error: { code, requestId },
    },
    { status }
  );
}

/**
 * A blocked IP never calls the quote callback, so WARP is not contacted.
 * If the limiter itself cannot run, the quote still proceeds. That outage used to return a body
 * with no error.code, which the checkout panel displayed as UNKNOWN, and it blocked every quote.
 */
export async function withQuoteRateLimit(
  status: QuoteLimitStatus,
  quote: () => Promise<Response>,
  detail?: string
): Promise<Response> {
  if (status === "blocked") {
    return limitFailure("INVALID_INPUT", QUOTE_RATE_LIMIT_MESSAGE, 429, QUOTE_RATE_LIMIT_MESSAGE);
  }
  if (status === "unconfigured" || status === "unavailable") {
    const requestId = shippingRequestId();
    const code = status === "unconfigured" ? "CONFIG" : "DB_ERROR";
    console.error(
      JSON.stringify({
        source: "shipping-quote",
        requestId,
        code,
        message: redactSecrets(detail || (status === "unconfigured" ? "service role is not configured" : "consume_shipping_quote_limit failed")),
      })
    );
    return quote();
  }
  return quote();
}
