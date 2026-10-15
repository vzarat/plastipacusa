import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

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

export type QuoteLimitStatus = "allowed" | "blocked" | "unavailable";

/**
 * Blocked and unavailable responses never call the quote callback, so WARP is not contacted.
 */
export async function withQuoteRateLimit(
  status: QuoteLimitStatus,
  quote: () => Promise<Response>
): Promise<Response> {
  if (status === "blocked") {
    return NextResponse.json({ ok: false, message: QUOTE_RATE_LIMIT_MESSAGE }, { status: 429 });
  }
  if (status === "unavailable") {
    return NextResponse.json(
      { ok: false, message: "We couldn't calculate shipping automatically." },
      { status: 500 }
    );
  }
  return quote();
}
