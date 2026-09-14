"use server";

import Stripe from "stripe";

export async function createPaymentIntent(
  amount: number,
  currency: "usd" | "mxn" = "usd"
): Promise<{ clientSecret: string }> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-08-26.dahlia" as any,
  });

  const normalizedAmount = Math.round(amount * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: normalizedAmount,
    currency,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error("Unable to create a Stripe PaymentIntent client secret.");
  }

  return {
    clientSecret: paymentIntent.client_secret,
  };
}
