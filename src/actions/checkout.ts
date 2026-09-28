"use server";

import Stripe from "stripe";

export async function createPaymentIntent(
  amount: number
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
      currency: "usd",
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

/**
 * Resolve a Checkout Session into a PaymentIntent id for order finalization.
 */
export async function resolveCheckoutSession(sessionId: string): Promise<{
  success: boolean;
  paymentIntentId?: string;
  customerEmail?: string | null;
  customerName?: string | null;
  shipping?: Record<string, string | null> | null;
  error?: string;
}> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return { success: false, error: "Stripe is not configured." };
    }
    if (!sessionId) {
      return { success: false, error: "Missing Checkout Session id." };
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer_details"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return {
        success: false,
        error: "Checkout Session payment is not complete yet.",
      };
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntentId) {
      return {
        success: false,
        error: "No PaymentIntent found on this Checkout Session.",
      };
    }

    const sessionWithShipping = session as Stripe.Checkout.Session & {
      shipping_details?: {
        address?: {
          line1?: string | null;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
        } | null;
        name?: string | null;
      } | null;
      collected_information?: {
        shipping_details?: {
          address?: {
            line1?: string | null;
            line2?: string | null;
            city?: string | null;
            state?: string | null;
            postal_code?: string | null;
            country?: string | null;
          } | null;
          name?: string | null;
        } | null;
      } | null;
    };

    const ship =
      sessionWithShipping.collected_information?.shipping_details ||
      sessionWithShipping.shipping_details ||
      null;

    return {
      success: true,
      paymentIntentId,
      customerEmail:
        session.customer_details?.email || session.customer_email || null,
      customerName: session.customer_details?.name || ship?.name || null,
      shipping: ship?.address
        ? {
            full_name: ship.name || session.customer_details?.name || null,
            line1: ship.address.line1 || null,
            line2: ship.address.line2 || null,
            city: ship.address.city || null,
            state: ship.address.state || null,
            postal_code: ship.address.postal_code || null,
            country: ship.address.country || null,
          }
        : null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resolveCheckoutSession] failed:", message);
    return { success: false, error: message };
  }
}
