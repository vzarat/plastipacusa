import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { cronAuthorized, planAbandonedCleanup } from "@/lib/payments/intent-attempt";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron. An hourly schedule requires Vercel Pro.
 * Set CRON_SECRET. Vercel sends Authorization: Bearer <CRON_SECRET>.
 * Pending orders older than 15 minutes with a succeeded or processing PaymentIntent are flagged.
 * Pending orders older than 24 hours with an open PaymentIntent are canceled and deleted.
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY || !isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Payment reconciliation is not configured." }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-08-26.dahlia" as Stripe.StripeConfig["apiVersion"],
  });
  const admin = createServiceRoleClient();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from("orders")
    .select("id, created_at, status, payment_intent_id")
    .eq("status", "pending_payment")
    .lt("created_at", cutoff);
  if (error) {
    return NextResponse.json({ error: "Could not read pending orders." }, { status: 500 });
  }

  let flagged = 0;
  let deleted = 0;
  for (const row of rows || []) {
    let intentStatus: string | null = null;
    const paymentIntentId = String(row.payment_intent_id || "");
    if (paymentIntentId) {
      try {
        intentStatus = (await stripe.paymentIntents.retrieve(paymentIntentId)).status;
      } catch {
        intentStatus = null;
      }
    }
    const action = planAbandonedCleanup({
      status: String(row.status || ""),
      createdAt: String(row.created_at || ""),
      intentStatus,
    });
    if (action === "flag_review") {
      const updated = await admin
        .from("orders")
        .update({
          status: "payment_review",
          payment_review: true,
          payment_review_reason: `PaymentIntent ${paymentIntentId} is ${intentStatus}.`,
        })
        .eq("id", row.id)
        .eq("status", "pending_payment");
      if (!updated.error) flagged += 1;
      continue;
    }
    if (action === "cancel_then_delete" && paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(paymentIntentId);
      } catch {
        // Already canceled or no longer open.
      }
    }
    if (action === "cancel_then_delete" || action === "delete") {
      const removed = await admin.from("orders").delete().eq("id", row.id).eq("status", "pending_payment");
      if (!removed.error) deleted += 1;
    }
  }

  return NextResponse.json({ flagged, deleted });
}
