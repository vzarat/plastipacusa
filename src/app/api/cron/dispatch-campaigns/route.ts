import { NextRequest, NextResponse } from "next/server";
import { dispatchPendingCampaignSends } from "@/actions/campaigns";
import { cronAuthorized } from "@/lib/payments/intent-attempt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rate-limited campaign email dispatcher (every 5 minutes on Vercel). */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchPendingCampaignSends();
  return NextResponse.json({ ok: true, ...result });
}
