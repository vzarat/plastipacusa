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

    return dbOrders.map((row: any) => {
        const rawStatus = row.fulfillment_status || row.status || "pending";
        const normalizedStatus: DashboardOrder["status"] =
          rawStatus === "fulfilled" || rawStatus === "delivered"
            ? "delivered"
            : rawStatus === "in_transit" || rawStatus === "shipped"
              ? "shipped"
              : "pending";

        return {
          id: row.id || row.po_number || `PO-USA-${row.id}`,
          date: row.created_at
            ? new Date(row.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—",
          status: normalizedStatus,
          totalUsd: Number(row.total_usd || row.total_amount || 0),
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

export default async function DashboardSettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/dashboard/settings");
  }

  if (currentUser.profile.role === "admin") {
    redirect("/admin");
  }

  const userOrders = await getDashboardOrders(currentUser);

  return (
    <DashboardClient profile={currentUser.profile} orders={userOrders} initialTab="settings" />
  );
}
