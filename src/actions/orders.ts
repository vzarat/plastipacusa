"use server";

import React from "react";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { formatOrderId } from "@/lib/utils";
import {
  getSenderEmail,
  notifyAdminPurchaseOrder,
  sendEmail,
} from "@/lib/email";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";

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
  let supabase: any = null;
  let user: any = null;
  let total = 0;
  let shippingAddress: any = {};

  try {
    // Prefer cookie session; fall back to service role so guest/paid returns still persist.
    try {
      supabase = await createServerClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      user = currentUser || null;
    } catch (sessionErr) {
      console.warn(
        "[createOrderFromCheckout] session client unavailable:",
        sessionErr
      );
    }

    if (isServiceRoleConfigured()) {
      try {
        supabase = createServiceRoleClient();
      } catch (svcErr) {
        console.warn(
          "[createOrderFromCheckout] service role unavailable:",
          svcErr
        );
      }
    }

    if (!supabase) {
      throw new Error("Database client is not available to save the order.");
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    let paymentIntentDetails: any = null;

    if (stripeSecretKey && !stripeSecretKey.startsWith("pk_")) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2026-08-26.dahlia" as any,
        });

        paymentIntentDetails = await stripe.paymentIntents.retrieve(
          paymentIntentId
        );
      } catch (fallbackError) {
        console.warn(
          "Unable to load Stripe payment intent fallback details:",
          fallbackError
        );
      }
    }

    if (paymentIntentDetails && paymentIntentDetails.status !== "succeeded") {
      throw new Error("Stripe payment was not completed successfully.");
    }

    // Prefer Stripe-verified amount when cart was cleared after redirect.
    const cartTotal = (cartItems || []).reduce((sum: number, item: any) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.totalPrice ?? item.unitPrice ?? 0);
      return sum + unitPrice * quantity;
    }, 0);

    total =
      cartTotal > 0
        ? cartTotal
        : Number(
            (
              (paymentIntentDetails?.amount_received ||
                paymentIntentDetails?.amount ||
                0) / 100
            ).toFixed(2)
          );

    const metaUserId =
      paymentIntentDetails?.metadata?.userId ||
      paymentIntentDetails?.metadata?.user_id ||
      shippingDetails?.userId ||
      shippingDetails?.user_id ||
      null;

    const resolvedUserId = user?.id || metaUserId || null;

    const paymentFullName =
      paymentIntentDetails?.shipping?.name ||
      shippingDetails?.full_name ||
      shippingDetails?.customer_name ||
      shippingDetails?.name ||
      paymentIntentDetails?.metadata?.customer_name ||
      null;

    const paymentEmail =
      paymentIntentDetails?.receipt_email ||
      shippingDetails?.email ||
      shippingDetails?.customer_email ||
      paymentIntentDetails?.metadata?.customer_email ||
      user?.email ||
      null;

    if (!paymentEmail) {
      console.warn(
        "[createOrderFromCheckout] No email on PaymentIntent/metadata — order will still save."
      );
    }

    shippingAddress = {
      full_name: paymentFullName,
      email: paymentEmail,
      line1:
        paymentIntentDetails?.shipping?.address?.line1 ||
        shippingDetails?.line1 ||
        shippingDetails?.street ||
        null,
      line2:
        paymentIntentDetails?.shipping?.address?.line2 ||
        shippingDetails?.line2 ||
        null,
      city:
        paymentIntentDetails?.shipping?.address?.city ||
        shippingDetails?.city ||
        null,
      state:
        paymentIntentDetails?.shipping?.address?.state ||
        shippingDetails?.state ||
        null,
      postal_code:
        paymentIntentDetails?.shipping?.address?.postal_code ||
        shippingDetails?.postal_code ||
        shippingDetails?.zip ||
        null,
      country:
        paymentIntentDetails?.shipping?.address?.country ||
        shippingDetails?.country ||
        null,
      stripe_payment_intent_id: paymentIntentId,
      guest_checkout: !resolvedUserId,
    };

    const payload: Record<string, unknown> = {
      status: "paid",
      total: Number(total.toFixed(2)),
      items: cartItems?.length
        ? cartItems
        : [
            {
              productName:
                paymentIntentDetails?.metadata?.items_summary ||
                "Plastipac Order",
              quantity: 1,
              unitPrice: Number(total.toFixed(2)),
              totalPrice: Number(total.toFixed(2)),
            },
          ],
      shipping_address: shippingAddress,
      created_at: new Date().toISOString(),
    };

    if (resolvedUserId) {
      payload.user_id = resolvedUserId;
    }

    const { data: existingOrders, error: existingError } = await supabase
      .from("orders")
      .select("id, shipping_address");

    if (existingError) {
      console.warn(
        "Unable to check existing checkout order record:",
        existingError.message
      );
    }

    const existingOrder = existingOrders?.find(
      (order: any) =>
        order.shipping_address?.stripe_payment_intent_id === paymentIntentId
    );

    if (existingOrder) {
      return {
        success: true,
        orderId: formatOrderId({
          id: existingOrder.id,
          createdAt: new Date().toISOString(),
          items: cartItems,
        }),
      };
    }

    let insertResult = await supabase
      .from("orders")
      .insert(payload)
      .select("id, status");

    // If user_id column rejects null guests, retry without user_id.
    if (
      insertResult.error &&
      !resolvedUserId &&
      /user_id|null|not-null|violates/i.test(insertResult.error.message || "")
    ) {
      const { user_id: _omit, ...withoutUser } = payload as Record<
        string,
        unknown
      > & { user_id?: string };
      insertResult = await supabase
        .from("orders")
        .insert(withoutUser)
        .select("id, status");
    }

    if (insertResult.error) {
      throw new Error(
        insertResult.error.message || "Failed to save the order."
      );
    }

    const data = insertResult.data;
    const insertedOrder = Array.isArray(data) ? data[0] : data;

    if (insertedOrder?.status !== "paid") {
      throw new Error("Order was not persisted with a paid status.");
    }

    const createdOrderId = formatOrderId({
      id: insertedOrder?.id || paymentIntentId,
      createdAt: new Date().toISOString(),
      items: cartItems,
    });

    try {
      const orderItems = (payload.items as any[]).map((item: any) => ({
        quantity: Number(item.quantity || 1),
        productName: item.productName || item.name || "Plastipac Product",
        linePrice:
          Number(item.totalPrice ?? item.unitPrice ?? 0) *
          Number(item.quantity || 1),
      }));

      const customerName = shippingAddress.full_name || "Customer";
      const customerEmail =
        shippingAddress.email || "customer@plastipacusa.com";
      const companyName =
        shippingDetails?.company_name ||
        shippingDetails?.companyName ||
        paymentIntentDetails?.metadata?.company_name ||
        "Plastipac USA Customer";
      const orderDate = new Date().toISOString();
      const totalAmount = Number(total.toFixed(2));
      const shippingState = shippingAddress.state
        ? String(shippingAddress.state)
        : "";
      const shippingCity = shippingAddress.city
        ? String(shippingAddress.city)
        : "";
      const shippingAddressSummary = [
        shippingAddress.line1,
        shippingAddress.line2,
        [shippingCity, shippingState, shippingAddress.postal_code]
          .filter(Boolean)
          .join(", "),
        shippingAddress.country,
      ]
        .filter(Boolean)
        .join(" · ");
      const itemsSummary = orderItems
        .map(
          (item: { quantity: number; productName: string }) =>
            `${item.quantity}× ${item.productName}`
        )
        .join("; ");

      const sender = getSenderEmail("orders@plastipacusa.com");

      await Promise.allSettled([
        sendEmail({
          from: `Plastipac USA <${sender}>`,
          to: customerEmail,
          subject: `Order Confirmation - Order #${createdOrderId}`,
          text: [
            `Thank you for your order.`,
            `PO Reference: ${createdOrderId}`,
            `Total: $${totalAmount.toFixed(2)}`,
          ].join("\n"),
          react: React.createElement(OrderConfirmationEmail, {
            orderId: createdOrderId,
            customerName,
            companyName,
            orderDate,
            totalAmount,
            items: orderItems,
            locale: "en",
            shippingAddress,
          }),
        }),
        notifyAdminPurchaseOrder({
          orderId: createdOrderId,
          customerName,
          customerEmail,
          customerCompany: companyName,
          totalAmount,
          shippingState,
          shippingCity,
          shippingAddressSummary,
          itemCount: orderItems.length,
          itemsSummary,
          orderDate,
        }),
      ]);
    } catch (emailError) {
      console.error("Order email dispatch error:", emailError);
    }

    return {
      success: true,
      orderId: createdOrderId,
    };
  } catch (error: any) {
    const errorMessage =
      error?.message || "Unexpected error while creating the order.";

    console.error("createOrderFromCheckout error:", errorMessage);

    if (supabase) {
      try {
        const failPayload: Record<string, unknown> = {
          status: "failed",
          total: Number(total.toFixed(2)),
          items: cartItems,
          shipping_address: {
            ...shippingAddress,
            error_details: errorMessage,
            attempted_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        };
        if (user?.id) failPayload.user_id = user.id;
        await supabase.from("orders").insert(failPayload);
      } catch (loggingError: any) {
        console.error(
          "Failed to persist checkout failure record:",
          loggingError?.message || loggingError
        );
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
