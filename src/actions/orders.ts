"use server";

import React from "react";
import Stripe from "stripe";
import { Resend } from "resend";
import { createServerClient } from "@/lib/supabase/server";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import { AdminOrderNotificationEmail } from "@/emails/AdminOrderNotificationEmail";

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
    supabase = await createServerClient();

    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    user = currentUser;

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

    total = cartItems.reduce((sum, item) => {
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

    shippingAddress = {
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
      stripe_payment_intent_id: paymentIntentId,
    };

    const payload = {
      user_id: user.id,
      status: "paid",
      total: Number(total.toFixed(2)),
      items: cartItems,
      shipping_address: shippingAddress,
      created_at: new Date().toISOString(),
    };

    const { data: existingOrders, error: existingError } = await supabase
      .from("orders")
      .select("id, shipping_address");

    if (existingError) {
      console.warn("Unable to check existing checkout order record:", existingError.message);
    }

    const existingOrder = existingOrders?.find(
      (order: any) => order.shipping_address?.stripe_payment_intent_id === paymentIntentId
    );

    if (existingOrder) {
      return {
        success: true,
        orderId: existingOrder.id,
      };
    }

    const { data, error } = await supabase.from("orders").insert(payload).select("id");

    if (error) {
      throw new Error(error.message || "Failed to save the order.");
    }

    const insertedOrder = Array.isArray(data) ? data[0] : data;
    const createdOrderId = insertedOrder?.id || paymentIntentId;

    try {
      const orderItems = (cartItems || []).map((item: any) => ({
        quantity: Number(item.quantity || 1),
        productName: item.productName || item.name || "Plastipac Product",
        linePrice: Number(item.totalPrice ?? item.unitPrice ?? 0) * Number(item.quantity || 1),
      }));

      const senderEmail = process.env.SENDER_EMAIL || process.env.ADMIN_EMAIL || "orders@plastipacusa.com";
      const adminEmail = process.env.ADMIN_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || "vzarat96@gmail.com";
      const resendApiKey = process.env.RESEND_API_KEY;

      if (resendApiKey) {
        const resend = new Resend(resendApiKey);

        const customerName = shippingAddress.full_name || "Customer";
        const customerEmail = shippingAddress.email || user.email || "customer@plastipacusa.com";
        const companyName = shippingDetails?.company_name || shippingDetails?.companyName || "Plastipac USA Customer";

        await Promise.allSettled([
          resend.emails.send({
            from: `Plastipac USA <${senderEmail}>`,
            to: [customerEmail],
            subject: `Order Confirmation - Order #${createdOrderId}`,
            react: React.createElement(OrderConfirmationEmail, {
              orderId: createdOrderId,
              customerName,
              companyName,
              orderDate: new Date().toISOString(),
              totalAmount: Number(total.toFixed(2)),
              items: orderItems,
              locale: "en",
              shippingAddress,
            }),
          }),
          resend.emails.send({
            from: `Plastipac USA <${senderEmail}>`,
            to: [adminEmail],
            subject: `New Order Received - #${createdOrderId}`,
            react: React.createElement(AdminOrderNotificationEmail, {
              orderId: createdOrderId,
              customerName,
              customerEmail,
              customerCompany: companyName,
              orderDate: new Date().toISOString(),
              totalAmount: Number(total.toFixed(2)),
              items: orderItems,
              shippingAddress,
              adminDashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://plastipacusa.com"}/admin/orders`,
            }),
          }),
        ]);
      }
    } catch (emailError) {
      console.error("Order email dispatch error:", emailError);
    }

    return {
      success: true,
      orderId: createdOrderId,
    };
  } catch (error: any) {
    const errorMessage = error?.message || "Unexpected error while creating the order.";

    console.error("createOrderFromCheckout error:", errorMessage);

    if (supabase && user?.id) {
      try {
        await supabase.from("orders").insert({
          user_id: user.id,
          status: "failed",
          total: Number(total.toFixed(2)),
          items: cartItems,
          shipping_address: {
            ...shippingAddress,
            error_details: errorMessage,
            attempted_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        });
      } catch (loggingError: any) {
        console.error("Failed to persist checkout failure record:", loggingError?.message || loggingError);
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
