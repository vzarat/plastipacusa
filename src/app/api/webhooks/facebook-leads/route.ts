import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { upsertLeadFromWebhook } from "@/actions/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Facebook Lead Ads webhook.
 *
 * Setup:
 * 1. Meta App → Webhooks → Page → subscribe to `leadgen`
 * 2. Callback URL: https://<domain>/api/webhooks/facebook-leads
 * 3. Verify token = FACEBOOK_LEAD_VERIFY_TOKEN
 * 4. Set FACEBOOK_PAGE_ACCESS_TOKEN (page token with leads_retrieval)
 * 5. Optional: FACEBOOK_APP_SECRET for X-Hub-Signature-256 verification
 */

function verifyFacebookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!secret) return true; // allow when secret not configured (dev)
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = process.env.FACEBOOK_LEAD_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type FacebookLeadField = { name?: string; values?: string[] };

async function fetchLeadDetails(leadgenId: string): Promise<Record<string, string>> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN is not configured.");
  }

  const url = new URL(`https://graph.facebook.com/v21.0/${encodeURIComponent(leadgenId)}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("fields", "id,created_time,field_data,ad_id,form_id");

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    id?: string;
    field_data?: FacebookLeadField[];
    ad_id?: string;
    form_id?: string;
  };

  const mapped: Record<string, string> = {
    external_id: String(json.id || leadgenId),
    ad_id: String(json.ad_id || ""),
    form_id: String(json.form_id || ""),
  };

  for (const field of json.field_data || []) {
    const name = String(field.name || "")
      .trim()
      .toLowerCase();
    const value = String(field.values?.[0] || "").trim();
    if (!name || !value) continue;
    mapped[name] = value;
  }

  return mapped;
}

function pickField(fields: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = fields[alias];
    if (value) return value;
  }
  return "";
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyFacebookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        field?: string;
        value?: { leadgen_id?: string; page_id?: string; form_id?: string };
      }>;
    }>;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "page") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const leadgenIds: string[] = [];
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;
      const id = change.value?.leadgen_id;
      if (id) leadgenIds.push(String(id));
    }
  }

  const results: Array<{ leadgenId: string; ok: boolean; error?: string }> = [];

  for (const leadgenId of leadgenIds) {
    try {
      const fields = await fetchLeadDetails(leadgenId);
      const email = pickField(fields, ["email", "email_address", "work_email"]).toLowerCase();
      if (!email) {
        results.push({ leadgenId, ok: false, error: "No email on lead" });
        continue;
      }

      const contactName =
        pickField(fields, ["full_name", "full name", "name"]) ||
        [pickField(fields, ["first_name", "first name"]), pickField(fields, ["last_name", "last name"])]
          .filter(Boolean)
          .join(" ");

      const result = await upsertLeadFromWebhook({
        email,
        contactName,
        companyName: pickField(fields, ["company_name", "company", "business_name"]),
        phone: pickField(fields, ["phone_number", "phone", "mobile_number"]),
        zipCode: pickField(fields, ["zip_code", "zip", "post_code", "postal_code"]),
        source: "facebook",
        tags: ["facebook", "lead-ad"],
        externalId: fields.external_id || leadgenId,
        metadata: {
          ad_id: fields.ad_id || null,
          form_id: fields.form_id || null,
          raw_fields: fields,
        },
      });

      results.push({
        leadgenId,
        ok: result.success,
        error: result.error,
      });
    } catch (err) {
      results.push({
        leadgenId,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
