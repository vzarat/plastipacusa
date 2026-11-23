import { NextRequest, NextResponse } from "next/server";
import {
  recordCampaignBounceByResendId,
  recordCampaignClickByResendId,
  recordCampaignOpenByResendId,
} from "@/actions/campaigns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend event webhook for campaign analytics (opens / clicks / bounces).
 * Configure in Resend → Webhooks → https://<domain>/api/webhooks/resend
 * Optional shared secret: RESEND_WEBHOOK_SECRET (checked via query ?secret= or header).
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return true;
  const header = request.headers.get("authorization") || "";
  if (header === `Bearer ${secret}`) return true;
  if (request.nextUrl.searchParams.get("secret") === secret) return true;
  return false;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    type?: string;
    data?: { email_id?: string; id?: string };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resendId = String(body.data?.email_id || body.data?.id || "").trim();
  const type = String(body.type || "").trim();

  if (!resendId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (type === "email.opened") {
    await recordCampaignOpenByResendId(resendId);
  } else if (type === "email.clicked") {
    await recordCampaignClickByResendId(resendId);
  } else if (type === "email.bounced" || type === "email.complained") {
    await recordCampaignBounceByResendId(resendId);
  }

  return NextResponse.json({ ok: true });
}
