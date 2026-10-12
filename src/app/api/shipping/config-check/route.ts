import { NextResponse } from "next/server";
import { SHOW_SHIPPING_DEBUG, inspectWarpSettings } from "@/lib/shipping/config";

export const runtime = "nodejs";

/** Names and OK / MISSING / INVALID only. No secret values. */
export async function GET() {
  if (!SHOW_SHIPPING_DEBUG) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  return NextResponse.json(inspectWarpSettings());
}
