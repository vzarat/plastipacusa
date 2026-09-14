import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    console.error("Stripe webhook verification failed:", error?.message || error);
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return NextResponse.json({ received: true });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;

  try {
    const supabase = await createServerClient();

    await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_intent_id: paymentIntent.id,
      })
      .eq("payment_intent_id", paymentIntent.id);
  } catch (error: any) {
    console.error("Stripe webhook order update failed:", error?.message || error);
    return NextResponse.json({ error: "Order update failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
