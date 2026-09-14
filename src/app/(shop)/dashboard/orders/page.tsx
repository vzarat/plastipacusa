import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { DashboardClient, DashboardOrder } from "@/components/dashboard/DashboardClient";
import { createServerClient } from "@/lib/supabase/server";

async function getDashboardOrders(currentUser: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!currentUser) {
    return [] as DashboardOrder[];
  }

  try {
    const supabase = await createServerClient();

    const { data: dbOrders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", currentUser.user.id)
      .order("created_at", { ascending: false });

    if (error || !dbOrders) {
      return [] as DashboardOrder[];
    }

    return dbOrders.map((row: any): DashboardOrder => {
      const rawStatus = String(row.status || row.fulfillment_status || "pending").toLowerCase();
      const hasFailureDetails = Boolean(
        row.shipping_address?.error_details || row.shipping_address?.error_message
      );

      const normalizedStatus: DashboardOrder["status"] = hasFailureDetails
        ? "failed"
        : rawStatus === "paid"
          ? "paid"
          : rawStatus === "fulfilled" || rawStatus === "delivered"
            ? "delivered"
            : rawStatus === "in_transit" || rawStatus === "shipped"
              ? "shipped"
              : "pending";

      const paymentStatus: DashboardOrder["paymentStatus"] = hasFailureDetails
        ? "failed"
        : rawStatus === "paid"
          ? "paid"
          : "pending";

      return {
        id: row.id || row.po_number || `PO-USA-${row.id}`,
        createdAt: row.created_at || undefined,
        date: row.created_at
          ? new Date(row.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
        status: normalizedStatus,
        paymentStatus,
        failureReason: row.shipping_address?.error_details || undefined,
        totalUsd: Number(row.total_usd || row.total_amount || row.total || 0),
        itemsSummary:
          row.items_summary ||
          (Array.isArray(row.items) && row.items.length > 0
            ? row.items
                .map((item: any) => item.product_name || item.productName || "Product")
                .join(", ")
            : "Industrial Stretch Packaging Order"),
        trackingNumber: row.tracking_number || undefined,
        items: Array.isArray(row.items) ? row.items : [],
      };
    });
  } catch {
    return [] as DashboardOrder[];
  }
}

export default async function DashboardOrdersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/dashboard/orders");
  }

  if (currentUser.profile.role === "admin") {
    redirect("/admin");
  }

  const orders = await getDashboardOrders(currentUser);

  return <DashboardClient profile={currentUser.profile} orders={orders} initialTab="overview" />;
}
