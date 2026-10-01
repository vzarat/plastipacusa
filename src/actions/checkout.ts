"use server";

import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import { calculateOrderTotal } from "@/lib/sales-tax";

export interface CreatePaymentIntentOptions {
  customerEmail?: string;
  customerName?: string;
  companyName?: string;
  itemsSummary?: string;
  productSlugs?: string[];
  /** Merchandise subtotal before tax. Tax is calculated on the server. */
  subtotal?: number;
  discountAmount?: number;
  shippingAmount?: number;
  shippingMethod?: string;
  shippingAddressId?: string;
  taxExemptRequested?: boolean;
  lineItems?: Array<{
    productName?: string;
    quantity?: number;
    unitPrice?: number;
  }>;
  shipping?: {
    fullName?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
    country?: string;
  };
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

    const quote = calculateOrderTotal({
      subtotal: Number(options.subtotal ?? amount ?? 0),
      discount: Number(options.discountAmount || 0),
      shipping: Number(options.shippingAmount || 0),
    });
    const normalizedAmount = Math.round(quote.total * 100);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 50) {
      return {
        success: false,
        error: "Order total must be at least $0.50 USD.",
      };
    }

    let userId = "";
    let sessionEmail = "";
    let supabase;
    try {
      supabase = await createServerClient();
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

    const slugs = (options.productSlugs || []).map((slug) => slug.trim()).filter(Boolean);
    if (slugs.length > 0) {
      const { data: soldOutRows, error: soldOutError } = await supabase
        .from("products")
        .select("slug, is_sold_out")
        .in("slug", slugs)
        .eq("is_sold_out", true);

      if (!soldOutError && soldOutRows && soldOutRows.length > 0) {
        return {
          success: false,
          error: "One or more products in your cart are sold out.",
        };
      }
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    const shippingMeta = options.shipping
      ? JSON.stringify({
          full_name: options.shipping.fullName || "",
          line1: options.shipping.line1 || "",
          line2: options.shipping.line2 || "",
          city: options.shipping.city || "",
          state: options.shipping.state || "",
          postal_code: options.shipping.postalCode || "",
          phone: options.shipping.phone || "",
          country: options.shipping.country || "US",
        }).slice(0, 500)
      : "";

    const lineItems = (options.lineItems || [])
      .map((item) => ({
        n: String(item.productName || "Product").slice(0, 40),
        q: Math.max(1, Number(item.quantity || 1)),
        u: Number(item.unitPrice || 0),
      }))
      .filter((item) => item.n);
    let lineItemsMeta = JSON.stringify(lineItems);
    while (lineItemsMeta.length > 500 && lineItems.length > 1) {
      lineItems.pop();
      lineItemsMeta = JSON.stringify(lineItems);
    }
    if (lineItemsMeta.length > 500) lineItemsMeta = "[]";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: normalizedAmount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail,
      shipping: options.shipping?.line1
        ? {
            name: options.shipping.fullName || options.customerName || "Customer",
            phone: options.shipping.phone || undefined,
            address: {
              line1: options.shipping.line1,
              line2: options.shipping.line2 || undefined,
              city: options.shipping.city || undefined,
              state: options.shipping.state || undefined,
              postal_code: options.shipping.postalCode || undefined,
              country: options.shipping.country || "US",
            },
          }
        : undefined,
      metadata: {
        userId: userId || "",
        user_id: userId || "",
        customer_email: customerEmail || "",
        customer_name: String(
          options.shipping?.fullName || options.customerName || ""
        ),
        company_name: String(options.companyName || ""),
        items_summary: String(options.itemsSummary || "").slice(0, 450),
        subtotal: quote.subtotal.toFixed(2),
        discount_amount: quote.discount.toFixed(2),
        shipping_amount: quote.shipping.toFixed(2),
        shipping_cost: quote.shipping.toFixed(2),
        shipping_method: String(options.shippingMethod || "").slice(0, 80),
        shipping_address_id: String(options.shippingAddressId || ""),
        tax_amount: quote.tax.toFixed(2),
        tax_rate: String(quote.taxRate),
        total_amount: quote.total.toFixed(2),
        tax_exempt_requested: options.taxExemptRequested ? "true" : "false",
        line_items: lineItemsMeta,
        shipping_address: shippingMeta,
        shipping_phone: String(options.shipping?.phone || "").slice(0, 40),
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

/** Attach the checkout shipping form to an existing PaymentIntent before confirm. */
export async function updatePaymentIntentShipping(
  paymentIntentId: string,
  shipping: NonNullable<CreatePaymentIntentOptions["shipping"]>
): Promise<{ success: boolean; error?: string }> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey || stripeSecretKey.startsWith("pk_")) {
      return { success: false, error: "Stripe is not configured." };
    }
    if (!paymentIntentId) {
      return { success: false, error: "Missing payment intent." };
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    const shippingMeta = JSON.stringify({
      full_name: shipping.fullName || "",
      line1: shipping.line1 || "",
      line2: shipping.line2 || "",
      city: shipping.city || "",
      state: shipping.state || "",
      postal_code: shipping.postalCode || "",
      phone: shipping.phone || "",
      country: shipping.country || "US",
    }).slice(0, 500);

    await stripe.paymentIntents.update(paymentIntentId, {
      shipping: {
        name: shipping.fullName || "Customer",
        phone: shipping.phone || undefined,
        address: {
          line1: shipping.line1 || "",
          line2: shipping.line2 || undefined,
          city: shipping.city || undefined,
          state: shipping.state || undefined,
          postal_code: shipping.postalCode || undefined,
          country: shipping.country || "US",
        },
      },
      metadata: {
        customer_name: shipping.fullName || "",
        shipping_address: shippingMeta,
        shipping_phone: String(shipping.phone || "").slice(0, 40),
      },
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
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
