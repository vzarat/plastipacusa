"use server";

import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";

export interface CreatePaymentIntentOptions {
  customerEmail?: string;
  customerName?: string;
  companyName?: string;
  itemsSummary?: string;
}

export async function createPaymentIntent(
  amount: number,
  options: CreatePaymentIntentOptions = {}
): Promise<{
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey || stripeSecretKey.startsWith("pk_")) {
      return {
        success: false,
        error:
          "Stripe secret key is missing or misconfigured (expected sk_… on the server).",
      };
    }

    const normalizedAmount = Math.round(Number(amount || 0) * 100);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 50) {
      return {
        success: false,
        error: "Order total must be at least $0.50 USD.",
      };
    }

    let userId = "";
    let sessionEmail = "";
    try {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || "";
      sessionEmail = (user?.email || "").trim().toLowerCase();
    } catch {
      return {
        success: false,
        error: "You must sign in to complete checkout.",
      };
    }

    if (!userId) {
      return {
        success: false,
        error: "You must sign in or create a B2B account to complete your order.",
      };
    }

    const customerEmail =
      (options.customerEmail || sessionEmail || "").trim().toLowerCase() ||
      undefined;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: normalizedAmount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail,
      metadata: {
        userId: userId || "",
        user_id: userId || "",
        customer_email: customerEmail || "",
        customer_name: String(options.customerName || ""),
        company_name: String(options.companyName || ""),
        items_summary: String(options.itemsSummary || "").slice(0, 450),
      },
    });

    if (!paymentIntent.client_secret) {
      return {
        success: false,
        error: "Stripe payment intent failed — missing client secret.",
      };
    }

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[createPaymentIntent] failed:", message);
    return {
      success: false,
      error: message || "Stripe secret key is missing or payment intent failed",
    };
  }
}

/**
 * Resolve a Checkout Session into a PaymentIntent id for order finalization
 * (legacy hosted Checkout Session support).
 */
export async function resolveCheckoutSession(sessionId: string): Promise<{
  success: boolean;
  paymentIntentId?: string;
  customerEmail?: string | null;
  customerName?: string | null;
  userId?: string | null;
  shipping?: Record<string, string | null> | null;
  error?: string;
}> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey || stripeSecretKey.startsWith("pk_")) {
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
      userId:
        session.metadata?.userId ||
        session.metadata?.user_id ||
        session.client_reference_id ||
        null,
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
