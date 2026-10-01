"use server";

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
  sendOrderConfirmationEmail,
} from "@/lib/email";
import {
  fetchPlastipacLogoForPdf,
  generateInvoicePdf,
} from "@/lib/invoice-pdf";
import { fetchOrderConfirmationTemplate } from "@/lib/email-template-store";
import { buildOrderConfirmationHtml } from "@/lib/order-confirmation-email";
import { calculateOrderTotal, roundMoney } from "@/lib/sales-tax";

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
      .select("id, shipping_address")
      .eq("payment_intent_id", paymentIntentId)
      .maybeSingle();

    const { data: existingOrders, error: existingError } = await supabase
      .from("orders")
      .select("id, shipping_address");

    if (existingError) {
      console.warn(
        "Unable to check existing checkout order record:",
        existingError.message
      );
    }

    const existingOrder =
      existingByIntent ||
      existingOrders?.find(
        (order: any) =>
          order.shipping_address?.stripe_payment_intent_id === paymentIntentId
      );

    if (existingOrder) {
      await supabase
        .from("orders")
        .update({
          payment_intent_id: paymentIntentId,
          subtotal: subtotalAmount,
          shipping: shippingAmount,
          shipping_cost: shippingAmount,
          shipping_method: shippingMethod,
          ...(shippingAddressId ? { shipping_address_id: shippingAddressId } : {}),
          tax: taxAmount,
          tax_amount: taxAmount,
          discount_amount: roundMoney(metaDiscount),
          tax_exempt_requested: taxExemptRequested,
          total: orderTotal,
          total_amount: orderTotal,
          shipping_address: {
            ...(existingOrder.shipping_address || {}),
            ...shippingAddress,
          },
        })
        .eq("id", existingOrder.id);

      return {
        success: true,
        orderId: formatOrderId({
          id: existingOrder.id,
          createdAt: new Date().toISOString(),
          items: cartItems,
        }),
      };
    }

    let insertResult = await insertOrderDroppingUnknownColumns(supabase, payload);

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
        shippingAddress.full_name,
        [shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(", "),
        [shippingCity, shippingState, shippingAddress.postal_code]
          .filter(Boolean)
          .join(", "),
        shippingAddress.phone ? `Phone: ${shippingAddress.phone}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      const itemsSummary = orderItems
        .map(
          (item: { quantity: number; productName: string }) =>
            `${item.quantity}× ${item.productName}`
        )
        .join("; ");

      const template = await fetchOrderConfirmationTemplate();
      const rendered = buildOrderConfirmationHtml(template, {
        orderId: createdOrderId,
        customerName,
        customerEmail,
        customerCompany: companyName,
        totalAmountUsd: totalAmount,
        itemsSummary,
        itemCount: orderItems.length,
        shippingAddressSummary,
        shippingAddress: {
          fullName: shippingAddress.full_name || customerName,
          line1: shippingAddress.line1 || undefined,
          line2: shippingAddress.line2 || undefined,
          city: shippingCity || undefined,
          state: shippingState || undefined,
          postalCode: shippingAddress.postal_code || undefined,
          phone: shippingAddress.phone || undefined,
        },
        orderDate,
        lineItems: orderItems.map((item) => ({
          description: item.productName,
          quantity: item.quantity,
          total: item.linePrice,
        })),
      });

      let pdfBytes: Uint8Array | null = null;
      try {
        const logo = await fetchPlastipacLogoForPdf();
        const idDigits = String(insertedOrder?.id || paymentIntentId)
          .replace(/[^0-9a-f]/gi, "")
          .slice(-4)
          .toUpperCase();
        pdfBytes = generateInvoicePdf({
          invoiceNumber: `INV-${new Date(orderDate).getFullYear()}-${idDigits || "0000"}`,
          orderPoRef: createdOrderId,
          issueDate: new Date(orderDate).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          paymentStatus: "Paid & Cleared",
          customerName,
          customerCompany: companyName,
          customerEmail,
          items: orderItems.map((item) => ({
            description: item.productName,
            quantity: item.quantity,
            unitPrice: item.quantity
              ? Number((item.linePrice / item.quantity).toFixed(2))
              : item.linePrice,
            total: item.linePrice,
          })),
          totalUsd: totalAmount,
          logo,
        });
      } catch (pdfError) {
        console.error("Invoice PDF generation error:", pdfError);
      }

      await Promise.allSettled([
        pdfBytes
          ? sendOrderConfirmationEmail({
              orderId: createdOrderId,
              customerName,
              customerEmail,
              customerCompany: companyName,
              totalAmountUsd: totalAmount,
              itemsSummary,
              itemCount: orderItems.length,
              shippingAddressSummary,
              shippingAddress: {
                fullName: shippingAddress.full_name || customerName,
                line1: shippingAddress.line1 || undefined,
                line2: shippingAddress.line2 || undefined,
                city: shippingCity || undefined,
                state: shippingState || undefined,
                postalCode: shippingAddress.postal_code || undefined,
                phone: shippingAddress.phone || undefined,
              },
              orderDate,
              lineItems: orderItems.map((item) => ({
                description: item.productName,
                quantity: item.quantity,
                total: item.linePrice,
              })),
              pdfBytes,
            })
          : sendEmail({
              from:
                rendered.from ||
                `Plastipac USA <${getSenderEmail("orders@plastipacusa.com")}>`,
              to: customerEmail,
              subject: rendered.subject,
              text: rendered.text,
              html: rendered.html,
              replyTo: template.footerSalesEmail,
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
          shippingPhone: shippingAddress.phone || undefined,
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
