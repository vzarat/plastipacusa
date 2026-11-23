import { NextRequest, NextResponse } from "next/server";
import { markStaleCartsAbandoned } from "@/actions/cart-sessions";
import { cronAuthorized } from "@/lib/payments/intent-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Marks active carts abandoned after ABANDONED_CART_HOURS (default 2). */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await markStaleCartsAbandoned();
  return NextResponse.json({ ok: true, updated: result.updated });
}
