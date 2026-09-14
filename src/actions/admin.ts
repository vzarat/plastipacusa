"use server";

import React from "react";
import { Resend } from "resend";
import { getCurrentUser } from "./auth";
import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";

export interface AdminOrderItem {
  productId: number;
  productSlug: string;
  productName: string;
  productImage: string;
  packageSize: string;
  totalRolls: number;
  totalBoxes: number;
  application: "hand" | "machine";
  sku: string;
  widthInches: string;
  gauge: number;
  lengthFeet: number;
  rollsPerBox: number;
  rollsPerPallet: number;
  weightLbs: string;
  pricingTier: string;
  unitPrice: number;
  quantity: number;
}

export interface AdminOrder {
  id: string; // e.g. "PO-USA-90412"
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  isGuest?: boolean;
  customerPhone?: string;
  shippingAddress: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    error_details?: string;
    attempted_at?: string;
    stripe_payment_intent_id?: string;
  };
  totalUsd: number;
  paymentStatus: "paid" | "pending" | "refunded" | "failed";
  fulfillmentStatus: "fulfilled" | "unfulfilled" | "in_transit" | "cancelled";
  itemsSummary: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  failureReason?: string;
  items: AdminOrderItem[];
  locale?: "en" | "es";
}

/**
 * Verifies that the current active session belongs to an administrator.
 */
export async function verifyAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { isAdmin: false, user: null, profile: null };
  }

  const isAdmin = currentUser.profile.role === "admin";
  return {
    isAdmin,
    user: currentUser.user,
    profile: currentUser.profile,
  };
}

/**
 * Retrieve all orders joined with client profile info from Supabase public.orders.
 */
export async function createOrder(order: AdminOrder) {
  try {
    const supabase = await createServerClient();
    const orderId = order.id;
    const locale = order.locale || "en";
    const insertPayload = {
      id: orderId,
      created_at: order.createdAt || new Date().toISOString(),
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      company_name: order.customerCompany,
      phone: order.customerPhone || null,
      shipping_address: order.shippingAddress,
      total_usd: Number(order.totalUsd || 0),
      payment_status: order.paymentStatus || "pending",
      fulfillment_status: order.fulfillmentStatus || "unfulfilled",
      items_summary: order.itemsSummary,
      tracking_number: order.trackingNumber || null,
      carrier: order.carrier || null,
      notes: order.notes || null,
      items: Array.isArray(order.items) ? order.items : [],
      locale,
    };

    const { error } = await supabase.from("orders").insert(insertPayload);

    if (error) {
      console.error("createOrder insert error:", error);
      return { success: false, error: error.message || "Failed to save order." };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL || "vzarat96@gmail.com";

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const recipients = Array.from(
          new Set([order.customerEmail, adminNotificationEmail].filter(Boolean))
        );

        await resend.emails.send({
          from: "Plastipac Orders <onboarding@resend.dev>",
          to: recipients,
          subject:
            locale === "es"
              ? `Confirmación de Pedido #${orderId} - Plastipac USA`
              : `Order Confirmation #${orderId} - Plastipac USA`,
          react: React.createElement(OrderConfirmationEmail, {
            orderId,
            customerName: order.customerName,
            companyName: order.customerCompany,
            orderDate: order.createdAt,
            totalAmount: Number(order.totalUsd || 0),
            items: order.items.map((item) => ({
              quantity: item.quantity,
              productName: item.productName,
              linePrice: Number((item.unitPrice || 0) * (item.quantity || 1)),
            })),
            locale,
          }),
        });
      } catch (emailError) {
        console.error("createOrder email dispatch error:", emailError);
      }
    }

    return { success: true, orderId, locale };
  } catch (err: any) {
    console.error("createOrder error:", err);
    return {
      success: false,
      error: err?.message || "Failed to create order.",
    };
  }
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  try {
    const supabase = await createServerClient();
    const { data: dbOrders, error } = await supabase
      .from("orders")
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          company_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getAdminOrders query failed:", error);
      return [];
    }

    return (dbOrders || []).map((row: any) => {
      const profile = row.profiles || {};
      const guestFullName = row.shipping_address?.full_name || row.shipping_address?.customer_name;
      const isGuest = !profile?.full_name && Boolean(guestFullName);
      const rawStatus = String(row.status || row.fulfillment_status || "pending").toLowerCase();
      const hasFailureDetails = Boolean(
        row.shipping_address?.error_details || row.shipping_address?.error_message
      );
      const paymentStatus = hasFailureDetails
        ? "failed"
        : (row.payment_status || (rawStatus === "paid" ? "paid" : "pending")) as any;
      const fulfillmentStatus = hasFailureDetails
        ? "unfulfilled"
        : (row.fulfillment_status ||
            (rawStatus === "paid" || rawStatus === "fulfilled" || rawStatus === "delivered"
              ? "fulfilled"
              : rawStatus === "in_transit" || rawStatus === "shipped"
                ? "in_transit"
                : "unfulfilled")) as any;

      return {
        id: row.id || row.po_number || `PO-USA-${row.id}`,
        createdAt: row.created_at || new Date().toISOString(),
        customerName:
          profile.full_name || guestFullName || row.customer_name || "Commercial Customer",
        customerEmail:
          profile.email || row.shipping_address?.email || row.customer_email || "sales@plastipacusa.com",
        customerCompany:
          profile.company_name || row.company_name || "Industrial Partner",
        isGuest,
        customerPhone: row.phone || "(956) 400 36 83",
        shippingAddress: row.shipping_address || {
          street: "1000 Commercial Parkway",
          city: "Dallas",
          state: "TX",
          zip: "75201",
          country: "United States",
        },
        totalUsd: Number(row.total_usd || row.total_amount || row.total || 0),
        paymentStatus,
        fulfillmentStatus,
        itemsSummary: row.items_summary || "Industrial Stretch Packaging Order",
        trackingNumber: row.tracking_number,
        carrier: row.carrier,
        notes: row.notes,
        failureReason:
          row.shipping_address?.error_details ||
          row.shipping_address?.error_message ||
          row.notes ||
          undefined,
        items: Array.isArray(row.items) ? row.items : [],
      };
    });
  } catch (err) {
    console.warn("Notice: public.orders query failed:", err);
    return [];
  }
}

/**
 * Server action to update an order's fulfillment status.
 * Requires administrator role.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: "fulfilled" | "unfulfilled" | "in_transit" | "cancelled"
) {
  try {
    const { isAdmin } = await verifyAdmin();
    if (!isAdmin) {
      return { success: false, error: "Unauthorized. Admin permissions required." };
    }

    const supabase = await createServerClient();

    // Try updating Supabase public.orders if present
    try {
      await supabase
        .from("orders")
        .update({
          status: newStatus,
          fulfillment_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    } catch (dbErr) {
      console.warn("Notice: database orders table update skipped:", dbErr);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { success: true, updatedStatus: newStatus };
  } catch (err: any) {
    console.error("updateOrderStatus error:", err);
    return { success: false, error: err?.message || "Failed to update order status." };
  }
}

