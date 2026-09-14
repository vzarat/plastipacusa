"use server";

import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";

export async function verifyPaymentIntent(paymentIntentId: string) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!paymentIntentId) {
    throw new Error("Missing payment intent identifier.");
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-08-26.dahlia" as any,
  });

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  return {
    paymentIntent: {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    },
  };
}

export async function createOrderFromCheckout(
  paymentIntentId: string,
  cartItems: any[] = [],
  shippingDetails: any = {}
) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return {
        success: false,
        error: "Unauthenticated. Please log in to complete your purchase.",
      };
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    let paymentIntentDetails: any = null;

    if (stripeSecretKey) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2026-08-26.dahlia" as any,
        });

        paymentIntentDetails = await stripe.paymentIntents.retrieve(paymentIntentId);
      } catch (fallbackError) {
        console.warn("Unable to load Stripe payment intent fallback details:", fallbackError);
      }
    }

    const total = cartItems.reduce((sum, item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.totalPrice ?? item.unitPrice ?? 0);
      return sum + unitPrice * quantity;
    }, 0);

    const paymentFullName =
      paymentIntentDetails?.shipping?.name ||
      paymentIntentDetails?.customer_details?.name ||
      shippingDetails?.full_name ||
      shippingDetails?.customer_name ||
      shippingDetails?.name ||
      null;

    const paymentEmail =
      paymentIntentDetails?.receipt_email ||
      paymentIntentDetails?.customer_details?.email ||
      shippingDetails?.email ||
      shippingDetails?.customer_email ||
      null;

    const shippingAddress = {
      full_name: paymentFullName,
      email: paymentEmail,
      line1:
        paymentIntentDetails?.shipping?.address?.line1 ||
        shippingDetails?.line1 ||
        shippingDetails?.street ||
        null,
      line2: paymentIntentDetails?.shipping?.address?.line2 || shippingDetails?.line2 || null,
      city:
        paymentIntentDetails?.shipping?.address?.city || shippingDetails?.city || null,
      state:
        paymentIntentDetails?.shipping?.address?.state || shippingDetails?.state || null,
      postal_code:
        paymentIntentDetails?.shipping?.address?.postal_code ||
        shippingDetails?.postal_code ||
        shippingDetails?.zip ||
        null,
      country:
        paymentIntentDetails?.shipping?.address?.country || shippingDetails?.country || null,
    };

    const payload = {
      user_id: user?.id || null,
      payment_intent_id: paymentIntentId,
      status: "paid",
      total: Number(total.toFixed(2)),
      items: cartItems,
      shipping_address: shippingAddress,
      created_at: new Date().toISOString(),
    };

    const { data: existingOrders, error: existingError } = await supabase
      .from("orders")
      .select("id")
      .eq("payment_intent_id", paymentIntentId)
      .limit(1);

    if (existingError) {
      console.warn("Unable to check existing checkout order record:", existingError.message);
    }

    if (existingOrders && existingOrders.length > 0) {
      return {
        success: true,
        orderId: existingOrders[0].id,
      };
    }

    const { data, error } = await supabase.from("orders").insert(payload).select("id");

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to save the order.",
      };
    }

    const insertedOrder = Array.isArray(data) ? data[0] : data;

    return {
      success: true,
      orderId: insertedOrder?.id || paymentIntentId,
    };
  } catch (error: any) {
    console.error("createOrderFromCheckout error:", error);
    return {
      success: false,
      error: error?.message || "Unexpected error while creating the order.",
    };
  }
}
