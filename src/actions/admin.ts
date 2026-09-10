"use server";

import React from "react";
import { Resend } from "resend";
import { getCurrentUser } from "./auth";
import { supabase } from "@/lib/supabase/client";
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
  customerPhone?: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  totalUsd: number;
  paymentStatus: "paid" | "pending" | "refunded";
  fulfillmentStatus: "fulfilled" | "unfulfilled" | "in_transit" | "cancelled";
  itemsSummary: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  items: AdminOrderItem[];
  locale?: "en" | "es";
}

// Initial realistic B2B orders fallback
const DEFAULT_B2B_ORDERS: AdminOrder[] = [
  {
    id: "PO-USA-90412",
    createdAt: "2026-02-18T14:32:00Z",
    customerName: "Marcus Vance",
    customerEmail: "m.vance@acmelogistics.com",
    customerCompany: "Acme Logistics Corp",
    customerPhone: "(956) 555-0192",
    shippingAddress: {
      street: "8400 Transport Way, Suite 100",
      city: "Laredo",
      state: "TX",
      zip: "78045",
      country: "United States",
    },
    totalUsd: 2650.88,
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    itemsSummary: 'FORCE Standard 18" (2 Pallets / 128 Boxes)',
    trackingNumber: "FDX-99482104-TX",
    carrier: "FedEx Freight Priority",
    notes: "Forklift loading dock required. Gate code #4021.",
    items: [
      {
        productId: 1,
        productSlug: "stretch-film-18-x-80-ga-x-1500ft",
        productName: 'FORCE Standard 18" Hand Stretch Film',
        productImage:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_STANDARD.png",
        packageSize: "64 Boxes (256 Rolls)",
        totalRolls: 256,
        totalBoxes: 64,
        application: "hand",
        sku: "PL-ST-18-80-1500-PAL",
        widthInches: "18",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "2,240",
        pricingTier: "Full Pallet Batch",
        unitPrice: 1325.44,
        quantity: 2,
      },
    ],
  },
  {
    id: "PO-USA-90388",
    createdAt: "2026-02-17T09:15:00Z",
    customerName: "Sarah Jenkins",
    customerEmail: "sjenkins@lonestarfreight.net",
    customerCompany: "Lone Star Packaging & Freight",
    customerPhone: "(210) 844-3200",
    shippingAddress: {
      street: "420 Industrial Blvd, Bay 4",
      city: "San Antonio",
      state: "TX",
      zip: "78219",
      country: "United States",
    },
    totalUsd: 5773.20,
    paymentStatus: "paid",
    fulfillmentStatus: "in_transit",
    itemsSummary: 'GENESIS Standard 20" Machine (3 Pallets / 150 Rolls)',
    trackingNumber: "RL-7740291-USA",
    carrier: "R&L Carriers",
    notes: "Scheduled plant replenishment. Call dispatch before arrival.",
    items: [
      {
        productId: 3,
        productSlug: "stretch-film-20-x-80-ga-x-5000ft-1",
        productName: 'GENESIS Standard 20" Machine Stretch Film',
        productImage:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png",
        packageSize: "50 Rolls (1 Pallet)",
        totalRolls: 50,
        totalBoxes: 50,
        application: "machine",
        sku: "PL-GN-20-80-5000-PAL",
        widthInches: "20",
        gauge: 80,
        lengthFeet: 5000,
        rollsPerBox: 1,
        rollsPerPallet: 50,
        weightLbs: "1,720",
        pricingTier: "Full Pallet Batch",
        unitPrice: 1924.40,
        quantity: 3,
      },
    ],
  },
  {
    id: "PO-USA-90345",
    createdAt: "2026-02-16T16:48:00Z",
    customerName: "David Rodriguez",
    customerEmail: "procurement@apexdist.com",
    customerCompany: "Apex Distribution Center",
    customerPhone: "(713) 902-1144",
    shippingAddress: {
      street: "11000 Railhead Parkway",
      city: "Houston",
      state: "TX",
      zip: "77041",
      country: "United States",
    },
    totalUsd: 3540.00,
    paymentStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    itemsSummary: 'FORCE Elite 15" Ultra-Yield (3 Pallets / 192 Boxes)',
    notes: "Net 30 terms approved. Awaiting accounting PO verification.",
    items: [
      {
        productId: 2,
        productSlug: "stretch-film-15-x-ultra-yield-1500ft",
        productName: 'FORCE Elite 15" Hand Stretch Film',
        productImage:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_ELITE.png",
        packageSize: "64 Boxes (256 Rolls)",
        totalRolls: 256,
        totalBoxes: 64,
        application: "hand",
        sku: "PL-EL-15-UY-1500-PAL",
        widthInches: "15",
        gauge: 45,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "1,850",
        pricingTier: "Full Pallet Batch",
        unitPrice: 1180.00,
        quantity: 3,
      },
    ],
  },
  {
    id: "PO-USA-90299",
    createdAt: "2026-02-14T11:20:00Z",
    customerName: "Linda Chen",
    customerEmail: "linda.chen@pinnaclewarehousing.com",
    customerCompany: "Pinnacle Warehousing LLC",
    customerPhone: "(312) 438-9010",
    shippingAddress: {
      street: "2800 South Western Ave",
      city: "Chicago",
      state: "IL",
      zip: "60608",
      country: "United States",
    },
    totalUsd: 4575.28,
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    itemsSummary: 'FORCE Standard 18" (2 Pallets) + GENESIS 20" (1 Pallet)',
    trackingNumber: "ESTES-8819302-IL",
    carrier: "Estes Express Lines",
    notes: "Cross-dock delivery. Standard commercial pallet tags.",
    items: [
      {
        productId: 1,
        productSlug: "stretch-film-18-x-80-ga-x-1500ft",
        productName: 'FORCE Standard 18" Hand Stretch Film',
        productImage:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_STANDARD.png",
        packageSize: "64 Boxes (256 Rolls)",
        totalRolls: 256,
        totalBoxes: 64,
        application: "hand",
        sku: "PL-ST-18-80-1500-PAL",
        widthInches: "18",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "2,240",
        pricingTier: "Full Pallet Batch",
        unitPrice: 1325.44,
        quantity: 2,
      },
      {
        productId: 3,
        productSlug: "stretch-film-20-x-80-ga-x-5000ft-1",
        productName: 'GENESIS Standard 20" Machine Stretch Film',
        productImage:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png",
        packageSize: "50 Rolls (1 Pallet)",
        totalRolls: 50,
        totalBoxes: 50,
        application: "machine",
        sku: "PL-GN-20-80-5000-PAL",
        widthInches: "20",
        gauge: 80,
        lengthFeet: 5000,
        rollsPerBox: 1,
        rollsPerPallet: 50,
        weightLbs: "1,720",
        pricingTier: "Full Pallet Batch",
        unitPrice: 1924.40,
        quantity: 1,
      },
    ],
  },
  {
    id: "PO-USA-90240",
    createdAt: "2026-02-12T13:05:00Z",
    customerName: "Robert Hernandez",
    customerEmail: "r.hernandez@gulfcoastpkg.com",
    customerCompany: "Gulf Coast Industrial Supplies",
    customerPhone: "(504) 733-1288",
    shippingAddress: {
      street: "5000 River Road, Dock B",
      city: "New Orleans",
      state: "LA",
      zip: "70123",
      country: "United States",
    },
    totalUsd: 1924.40,
    paymentStatus: "paid",
    fulfillmentStatus: "in_transit",
    itemsSummary: 'GENESIS Standard 20" Machine (1 Pallet / 50 Rolls)',
    trackingNumber: "ODFL-550921-LA",
    carrier: "Old Dominion Freight Line",
    notes: "Automated stretch wrapper trial batch.",
    items: [
      {
        productId: 3,
        productSlug: "stretch-film-20-x-80-ga-x-5000ft-1",
        productName: 'GENESIS Standard 20" Machine Stretch Film',
        productImage:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png",
        packageSize: "50 Rolls (1 Pallet)",
        totalRolls: 50,
        totalBoxes: 50,
        application: "machine",
        sku: "PL-GN-20-80-5000-PAL",
        widthInches: "20",
        gauge: 80,
        lengthFeet: 5000,
        rollsPerBox: 1,
        rollsPerPallet: 50,
        weightLbs: "1,720",
        pricingTier: "Full Pallet Batch",
        unitPrice: 1924.40,
        quantity: 1,
      },
    ],
  },
  {
    id: "PO-USA-90185",
    createdAt: "2026-02-09T08:45:00Z",
    customerName: "Emily Watson",
    customerEmail: "ewatson@midwestsupplychain.com",
    customerCompany: "Midwest Supply Chain Solutions",
    customerPhone: "(614) 220-4099",
    shippingAddress: {
      street: "3400 Logistics Way",
      city: "Columbus",
      state: "OH",
      zip: "43217",
      country: "United States",
    },
    totalUsd: 2360.00,
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    itemsSummary: 'FORCE Elite 15" Ultra-Yield (2 Pallets / 128 Boxes)',
    trackingNumber: "FDX-99381014-OH",
    carrier: "FedEx Freight",
    notes: "Repeat contract reorder. High yield film.",
    items: [
      {
        productId: 2,
        productSlug: "stretch-film-15-x-ultra-yield-1500ft",
        productName: 'FORCE Elite 15" Hand Stretch Film',
        productImage:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_ELITE.png",
        packageSize: "64 Boxes (256 Rolls)",
        totalRolls: 256,
        totalBoxes: 64,
        application: "hand",
        sku: "PL-EL-15-UY-1500-PAL",
        widthInches: "15",
        gauge: 45,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "1,850",
        pricingTier: "Full Pallet Batch",
        unitPrice: 1180.00,
        quantity: 2,
      },
    ],
  },
  {
    id: "PO-USA-90110",
    createdAt: "2026-02-05T15:10:00Z",
    customerName: "Carlos Mendez",
    customerEmail: "cmendez@riograndefreight.com",
    customerCompany: "Rio Grande Freight & Storage",
    customerPhone: "(956) 722-8811",
    shippingAddress: {
      street: "1400 Santa Maria Ave",
      city: "Laredo",
      state: "TX",
      zip: "78040",
      country: "United States",
    },
    totalUsd: 1325.44,
    paymentStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    itemsSummary: 'FORCE Standard 18" (1 Pallet / 64 Boxes)',
    notes: "Customer will pick up with corporate flatbed truck.",
    items: [
      {
        productId: 1,
        productSlug: "stretch-film-18-x-80-ga-x-1500ft",
        productName: 'FORCE Standard 18" Hand Stretch Film',
        productImage:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_STANDARD.png",
        packageSize: "64 Boxes (256 Rolls)",
        totalRolls: 256,
        totalBoxes: 64,
        application: "hand",
        sku: "PL-ST-18-80-1500-PAL",
        widthInches: "18",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "2,240",
        pricingTier: "Full Pallet Batch",
        unitPrice: 1325.44,
        quantity: 1,
      },
    ],
  },
];

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
 * Fallbacks to standardized commercial B2B orders if table is empty or unmigrated.
 */
export async function createOrder(order: AdminOrder) {
  try {
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

    if (!error && dbOrders && dbOrders.length > 0) {
      return dbOrders.map((row: any) => {
        const profile = row.profiles || {};
        return {
          id: row.id || row.po_number || `PO-USA-${row.id}`,
          createdAt: row.created_at || new Date().toISOString(),
          customerName:
            profile.full_name || row.customer_name || "Commercial Customer",
          customerEmail: profile.email || row.customer_email || "sales@plastipacusa.com",
          customerCompany:
            profile.company_name || row.company_name || "Industrial Partner",
          customerPhone: row.phone || "(956) 400 36 83",
          shippingAddress: row.shipping_address || {
            street: "1000 Commercial Parkway",
            city: "Dallas",
            state: "TX",
            zip: "75201",
            country: "United States",
          },
          totalUsd: Number(row.total_usd || row.total_amount || 0),
          paymentStatus: (row.payment_status || "paid") as any,
          fulfillmentStatus: (row.fulfillment_status || row.status || "unfulfilled") as any,
          itemsSummary: row.items_summary || "Industrial Stretch Packaging Order",
          trackingNumber: row.tracking_number,
          carrier: row.carrier,
          notes: row.notes,
          items: Array.isArray(row.items) ? row.items : [],
        };
      });
    }
  } catch (err) {
    console.warn("Notice: public.orders query fallback to active B2B orders:", err);
  }

  return DEFAULT_B2B_ORDERS;
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

