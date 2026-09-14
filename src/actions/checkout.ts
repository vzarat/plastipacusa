"use server";

import Stripe from "stripe";

export async function createPaymentIntent(
  amount: number,
  currency: "usd" | "mxn" = "usd"
): Promise<{ success: boolean; clientSecret?: string; error?: string }> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      return {
        success: false,
        error: "Stripe secret key is missing or payment intent failed",
      };
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
      return {
        success: false,
        error: "Stripe secret key is missing or payment intent failed",
      };
    }

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
    };
  } catch {
    return {
      success: false,
      error: "Stripe secret key is missing or payment intent failed",
    };
  }
}
