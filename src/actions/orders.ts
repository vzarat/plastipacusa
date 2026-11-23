"use server";

import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { formatOrderId } from "@/lib/utils";
import {
  formatFridayDeliveryDate,
  readFridayDeliveryIso,
} from "@/lib/shipping/friday-delivery";
import { calculateOrderTotal, roundMoney } from "@/lib/sales-tax";
import { markCartSessionsConverted } from "@/actions/cart-sessions";

async function insertOrderDroppingUnknownColumns(
  supabase: { from: (table: string) => any },
  payload: Record<string, unknown>
) {
  let next = { ...payload };
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await supabase
      .from("orders")
      .insert(next)
      .select("id, status");
    if (!result.error) return result;
    const message = String(result.error.message || "");
    const missing =
      message.match(/Could not find the ['"]([a-z0-9_]+)['"] column/i) ||
      message.match(/column ["']?([a-z0-9_]+)["']?/i);
    const unknownColumn =
      /does not exist/i.test(message) || /schema cache/i.test(message);
    if (!missing || !unknownColumn || !(missing[1] in next)) return result;
    delete next[missing[1]];
    next = { ...next };
  }
  return supabase.from("orders").insert(next).select("id, status");
}

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
      fridayDeliveryDate: (() => {
        const iso = readFridayDeliveryIso(paymentIntent.metadata?.friday_delivery_date);
        return iso ? formatFridayDeliveryDate(iso) : null;
      })(),
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
      const quantity = Math.max(1, Number(item.quantity || 1));
      const lineTotal = Number(item.totalPrice);
      if (Number.isFinite(lineTotal) && lineTotal > 0) return sum + lineTotal;
      return sum + Number(item.unitPrice || 0) * quantity;
    }, 0);

    const chargedUsd = roundMoney(
      (paymentIntentDetails?.amount_received ||
        paymentIntentDetails?.amount ||
        0) / 100
    );
    const metaSubtotal = Number(
      paymentIntentDetails?.metadata?.subtotal || shippingDetails?.subtotal || 0
    );
    const metaDiscount = Number(
      paymentIntentDetails?.metadata?.discount_amount ||
        shippingDetails?.discount ||
        0
    );
    const metaShipping = Number(
      paymentIntentDetails?.metadata?.shipping_amount ||
        shippingDetails?.shipping ||
        0
    );
    const metaTax = Number(
      paymentIntentDetails?.metadata?.tax_amount || shippingDetails?.tax || 0
    );
    const merchandise = metaSubtotal > 0 ? metaSubtotal : cartTotal;
    const quote = calculateOrderTotal({
      subtotal: merchandise,
      discount: metaDiscount,
      shipping: metaShipping,
      taxExempt: paymentIntentDetails?.metadata?.tax_exempt === "true",
    });
    const taxAmount = metaTax > 0 ? roundMoney(metaTax) : quote.tax;
    const subtotalAmount = quote.subtotal;
    const shippingAmount = quote.shipping;

    total = chargedUsd > 0 ? chargedUsd : quote.total;

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
        "US",
      phone:
        paymentIntentDetails?.shipping?.phone ||
        shippingDetails?.phone ||
        paymentIntentDetails?.metadata?.shipping_phone ||
        null,
      street:
        paymentIntentDetails?.shipping?.address?.line1 ||
        shippingDetails?.line1 ||
        shippingDetails?.street ||
        null,
      zip:
        paymentIntentDetails?.shipping?.address?.postal_code ||
        shippingDetails?.postal_code ||
        shippingDetails?.zip ||
        null,
      stripe_payment_intent_id: paymentIntentId,
      guest_checkout: !resolvedUserId,
      subtotal: subtotalAmount,
      shipping_amount: shippingAmount,
      shipping_cost: shippingAmount,
      tax_amount: taxAmount,
      tax_rate: 0.0825,
      discount_amount: roundMoney(metaDiscount),
      shipping_method:
        paymentIntentDetails?.metadata?.shipping_method ||
        shippingDetails?.shipping_method ||
        null,
      shipping_provider: paymentIntentDetails?.metadata?.shipping_provider || null,
      shipping_mode: paymentIntentDetails?.metadata?.shipping_mode || null,
      shipping_service: paymentIntentDetails?.metadata?.shipping_service || null,
      shipping_quote_id: paymentIntentDetails?.metadata?.shipping_quote_id || null,
      shipping_price: paymentIntentDetails?.metadata?.shipping_amount || null,
      shipping_transit_days: paymentIntentDetails?.metadata?.shipping_transit_days || null,
      destination_zip:
        paymentIntentDetails?.metadata?.destination_zip ||
        paymentIntentDetails?.shipping?.address?.postal_code ||
        null,
      shipping_address_id:
        paymentIntentDetails?.metadata?.shipping_address_id ||
        shippingDetails?.shipping_address_id ||
        null,
      tax_exempt_requested:
        String(
          paymentIntentDetails?.metadata?.tax_exempt_requested ||
            shippingDetails?.tax_exempt_requested ||
            ""
        ) === "true" || shippingDetails?.taxExemptRequested === true,
      friday_delivery_date:
        readFridayDeliveryIso(paymentIntentDetails?.metadata?.friday_delivery_date) ||
        readFridayDeliveryIso(shippingDetails?.friday_delivery_date) ||
        null,
    };

    const metaShippingRaw = paymentIntentDetails?.metadata?.shipping_address;
    if (metaShippingRaw) {
      try {
        const parsed = JSON.parse(String(metaShippingRaw));
        shippingAddress = {
          ...parsed,
          ...Object.fromEntries(
            Object.entries(shippingAddress).filter(([, value]) => value)
          ),
          stripe_payment_intent_id: paymentIntentId,
        };
        if (!shippingAddress.street && shippingAddress.line1) {
          shippingAddress.street = shippingAddress.line1;
        }
        if (!shippingAddress.zip && shippingAddress.postal_code) {
          shippingAddress.zip = shippingAddress.postal_code;
        }
        shippingAddress.guest_checkout = !resolvedUserId;
      } catch {
        // Keep the structured address already built above.
      }
    }

    const orderTotal = Number(total.toFixed(2));
    const shippingMethod = shippingAddress.shipping_method || null;
    const shippingAddressId = shippingAddress.shipping_address_id || null;
    const taxExemptRequested = Boolean(shippingAddress.tax_exempt_requested);

    const payload: Record<string, unknown> = {
      status: "paid",
      payment_intent_id: paymentIntentId,
      user_id: resolvedUserId || null,
      subtotal: subtotalAmount,
      shipping: shippingAmount,
      shipping_cost: shippingAmount,
      shipping_method: shippingMethod,
      shipping_address_id: shippingAddressId || null,
      tax: taxAmount,
      tax_amount: taxAmount,
      discount_amount: roundMoney(metaDiscount),
      tax_exempt_requested: taxExemptRequested,
      total: orderTotal,
      total_amount: orderTotal,
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

    if (!resolvedUserId) {
      delete payload.user_id;
    }
    if (!shippingAddressId) {
      delete payload.shipping_address_id;
    }

    const { data: existingByIntent } = await supabase
      .from("orders")
      .select("id, created_at, items, shipping_address, status")
      .eq("payment_intent_id", paymentIntentId)
      .neq("status", "pending_payment")
      .maybeSingle();

    const { data: pendingPayment } = await supabase
      .from("orders")
      .select("id, created_at, items")
      .eq("payment_intent_id", paymentIntentId)
      .eq("status", "pending_payment")
      .maybeSingle();
    if (pendingPayment?.id) {
      // Payment already succeeded — settle the pending row instead of erroring the customer.
      try {
        if (isServiceRoleConfigured()) {
          const admin = createServiceRoleClient();
          const settled = await admin.rpc("settle_paid_order", {
            p_order_id: String(pendingPayment.id),
          });
          if (settled.error) {
            console.warn(
              "[createOrderFromCheckout] settle_paid_order:",
              settled.error.message
            );
            await admin
              .from("orders")
              .update({
                status: "paid",
                payment_status: "Paid & Cleared",
                booking_status: "needs_booking",
                fulfillment_status: "unfulfilled",
              })
              .eq("id", pendingPayment.id)
              .eq("status", "pending_payment");
          }
        }
      } catch (settleError) {
        console.warn("[createOrderFromCheckout] pending settle:", settleError);
      }
      const settledOrderId = formatOrderId({
        id: pendingPayment.id,
        createdAt: String(pendingPayment.created_at || new Date().toISOString()),
        items:
          (Array.isArray(pendingPayment.items)
            ? (pendingPayment.items as {
                gauge?: string | number | null;
                quantity?: number;
              }[])
            : null) || cartItems,
      });
      await markCartSessionsConverted({
        userId: user?.id || null,
        email:
          shippingDetails?.email ||
          paymentIntentDetails?.receipt_email ||
          paymentIntentDetails?.metadata?.email ||
          null,
        orderId: settledOrderId,
      });
      return {
        success: true,
        orderId: settledOrderId,
      };
    }

    if (existingByIntent) {
      // Already settled (webhook or prior success). Do not rewrite lines/address from the client.
      const existingOrderId = formatOrderId({
        id: existingByIntent.id,
        createdAt: String(existingByIntent.created_at || new Date().toISOString()),
        items:
          (Array.isArray(existingByIntent.items)
            ? (existingByIntent.items as {
                gauge?: string | number | null;
                quantity?: number;
              }[])
            : null) || cartItems,
      });
      await markCartSessionsConverted({
        userId: user?.id || null,
        email:
          shippingDetails?.email ||
          paymentIntentDetails?.receipt_email ||
          paymentIntentDetails?.metadata?.email ||
          null,
        orderId: existingOrderId,
      });
      return {
        success: true,
        orderId: existingOrderId,
      };
    }

    // Fail closed: never invent a confirmation from the PaymentIntent alone.
    // Settlement belongs to the Stripe webhook + pending_payment row created at pay time.
    return {
      success: false,
      error:
        "Your payment went through, but we are still confirming the order. Please wait a moment or contact support with your payment reference — do not pay again.",
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
