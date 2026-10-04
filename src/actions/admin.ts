"use server";

import React from "react";
import { getCurrentUser } from "./auth";
import { createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { formatOrderId } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { OrderConfirmationEmail } from "@/emails/OrderConfirmationEmail";
import {
  getSenderEmail,
  notifyAdminPurchaseOrder,
  sendEmail,
} from "@/lib/email";

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
    full_name?: string;
    name?: string;
    phone?: string;
    street?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    postal_code?: string;
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

export interface AdminCustomer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  creditTerms: string;
  creditLimit: number;
  creditUsed: number;
  taxExempt: boolean;
  taxId?: string;
  creditApplicationStatus?: "pending" | "approved" | "rejected";
  status: "approved" | "under_review" | "suspended";
  createdAt?: string;
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
    const createdAt = order.createdAt || new Date().toISOString();
    const normalizedOrderId = formatOrderId({
      id: order.id,
      createdAt,
      items: order.items,
    });
    const locale = order.locale || "en";
    const insertPayload = {
      id: normalizedOrderId,
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

    const orderId = normalizedOrderId;
    const shipping = order.shippingAddress || {};
    const shippingState = shipping.state ? String(shipping.state) : "";
    const shippingCity = shipping.city ? String(shipping.city) : "";
    const shippingAddressSummary = [
      shipping.full_name || order.customerName,
      [shipping.street || shipping.line1, shipping.line2].filter(Boolean).join(", "),
      [shippingCity, shippingState, shipping.postal_code || shipping.zip]
        .filter(Boolean)
        .join(", "),
      shipping.phone || order.customerPhone
        ? `Phone: ${shipping.phone || order.customerPhone}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const items = Array.isArray(order.items) ? order.items : [];
      const itemsSummary =
        order.itemsSummary ||
        items
          .map((item) => `${item.quantity}× ${item.productName}`)
          .join("; ");

      await Promise.allSettled([
        sendEmail({
          from: `Plastipac Orders <${getSenderEmail("onboarding@resend.dev")}>`,
          to: order.customerEmail,
          subject: `Order Confirmation #${orderId} - Plastipac USA`,
          text: [
            `PO Reference: ${orderId}`,
            `Total: $${Number(order.totalUsd || 0).toFixed(2)}`,
          ].join("\n"),
          react: React.createElement(OrderConfirmationEmail, {
            orderId,
            customerName: order.customerName,
            companyName: order.customerCompany,
            orderDate: order.createdAt,
            totalAmount: Number(order.totalUsd || 0),
            items: items.map((item) => ({
              quantity: item.quantity,
              productName: item.productName,
              linePrice: Number((item.unitPrice || 0) * (item.quantity || 1)),
            })),
            locale,
            shippingAddress: {
              full_name: shipping.full_name || order.customerName,
              line1: shipping.line1 || shipping.street,
              line2: shipping.line2,
              city: shipping.city,
              state: shipping.state,
              postal_code: shipping.postal_code || shipping.zip,
              phone: shipping.phone || order.customerPhone,
            },
          }),
        }),
        notifyAdminPurchaseOrder({
          orderId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerCompany: order.customerCompany,
          totalAmount: Number(order.totalUsd || 0),
          shippingState,
          shippingCity,
          shippingAddressSummary,
          shippingPhone: shipping.phone || order.customerPhone,
          itemCount: items.length,
          itemsSummary,
          orderDate: order.createdAt || createdAt,
        }),
      ]);
    } catch (emailError) {
      console.error("createOrder email dispatch error:", emailError);
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

export async function getAdminCustomers(): Promise<AdminCustomer[]> {
  try {
    const supabase = createServiceRoleClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "getAdminCustomers query failed:",
        error.message || JSON.stringify(error, null, 2)
      );
      return [];
    }

    return (profiles || []).map((profile: any) => {
      const creditStatus = String(
        profile.credit_application_status || "pending"
      ).toLowerCase();
      let status: AdminCustomer["status"] = "under_review";
      if (creditStatus === "approved" || profile.role === "admin") {
        status = "approved";
      } else if (creditStatus === "rejected") {
        status = "suspended";
      }

      const taxExempt = Boolean(
        profile.is_tax_exempt && profile.tax_certificate_url
      );

      return {
        id: profile.id,
        companyName: profile.company_name || "Individual Customer",
        contactName: profile.full_name || "Customer",
        email: profile.email || "",
        phone: profile.phone || "",
        city: "",
        state: "",
        creditTerms: profile.credit_terms || "Registered",
        creditLimit: Number(profile.credit_limit || 0),
        creditUsed: 0,
        taxExempt,
        taxId: profile.tax_id || "",
        creditApplicationStatus:
          creditStatus === "approved" || creditStatus === "rejected"
            ? creditStatus
            : "pending",
        status,
        createdAt: profile.created_at,
      };
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : JSON.stringify(error, null, 2);
    console.error("getAdminCustomers query failed:", message);
    return [];
  }
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  try {
    const supabase = await createServerClient();

    // No FK between orders.user_id and profiles — fetch separately and join in memory.
    const { data: dbOrders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(
        "getAdminOrders query failed:",
        error.message || error.code || "unknown error"
      );
      return [];
    }

    const userIds = Array.from(
      new Set(
        (dbOrders || [])
          .map((row: { user_id?: string | null }) => row.user_id)
          .filter((id): id is string => Boolean(id))
      )
    );

    const profilesById: Record<
      string,
      { id: string; full_name?: string; company_name?: string; email?: string }
    > = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.warn(
          "getAdminOrders profiles enrich failed:",
          profilesError.message || profilesError.code || "unknown error"
        );
      } else {
        for (const profile of profiles || []) {
          profilesById[profile.id] = profile;
        }
      }
    }

    return (dbOrders || []).map((row: any) => {
      const profile = (row.user_id && profilesById[row.user_id]) || {};
      const guestFullName =
        row.shipping_address?.full_name || row.shipping_address?.customer_name;
      const isGuest = !profile?.full_name && Boolean(guestFullName);
      const rawStatus = String(
        row.status || row.fulfillment_status || "pending"
      ).toLowerCase();
      const hasFailureDetails = Boolean(
        row.shipping_address?.error_details ||
          row.shipping_address?.error_message
      );
      const rawPayment = String(row.payment_status || "").toLowerCase();
      const isPaid =
        rawPayment === "paid" ||
        rawPayment === "completed" ||
        rawStatus === "paid" ||
        rawStatus === "completed";
      const paymentStatus = hasFailureDetails
        ? "failed"
        : isPaid
          ? "paid"
          : rawPayment === "refunded" || rawStatus === "refunded"
            ? "refunded"
            : rawPayment === "failed" || rawStatus === "failed"
              ? "failed"
              : "pending";
      const fulfillmentStatus = hasFailureDetails
        ? "unfulfilled"
        : ((row.fulfillment_status ||
            (rawStatus === "paid" ||
            rawStatus === "completed" ||
            rawStatus === "fulfilled" ||
            rawStatus === "delivered"
              ? "fulfilled"
              : rawStatus === "in_transit" || rawStatus === "shipped"
                ? "in_transit"
                : "unfulfilled")) as any);

      return {
        id: row.id || row.po_number || `PO-USA-${row.id}`,
        createdAt: row.created_at || new Date().toISOString(),
        customerName:
          profile.full_name ||
          guestFullName ||
          row.customer_name ||
          "Commercial Customer",
        customerEmail:
          profile.email ||
          row.shipping_address?.email ||
          row.customer_email ||
          "sales@plastipacusa.com",
        customerCompany:
          profile.company_name || row.company_name || "Industrial Partner",
        isGuest,
        customerPhone:
          row.phone ||
          row.shipping_address?.phone ||
          undefined,
        shippingAddress: row.shipping_address || {},
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

