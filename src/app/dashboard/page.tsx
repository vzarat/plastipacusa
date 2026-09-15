import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { SetPasswordModal } from "@/components/auth/SetPasswordModal";
import { DashboardClient, DashboardOrder } from "@/components/dashboard/DashboardClient";
import { createServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Dashboard | Plastipac USA",
  description: "Manage recurring stretch film orders, review dispatch statuses, and trigger 1-click batch reorders.",
};

async function getDashboardOrders(
  currentUser: Awaited<ReturnType<typeof getCurrentUser>>
): Promise<DashboardOrder[]> {
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
        const normalizedStatus: DashboardOrder["status"] =
          hasFailureDetails
            ? "failed"
            : rawStatus === "paid"
              ? "paid"
              : rawStatus === "fulfilled" || rawStatus === "delivered"
                ? "delivered"
                : rawStatus === "in_transit" || rawStatus === "shipped"
                  ? "shipped"
                  : "pending";

        const paymentStatus: DashboardOrder["paymentStatus"] =
          hasFailureDetails
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
          customerName: row.customer_name || row.shipping_address?.full_name || row.shipping_address?.name || undefined,
          customerEmail: row.customer_email || row.shipping_address?.email || undefined,
          customerCompany: row.company_name || row.shipping_address?.company_name || undefined,
          customerPhone: row.phone || row.shipping_address?.phone || undefined,
          shippingAddress: row.shipping_address || undefined,
          items: Array.isArray(row.items) ? row.items : [],
        };
      });
  } catch {
    return [] as DashboardOrder[];
  }
}

export default async function DashboardPage({ searchParams }: any) {
  const currentUser = await getCurrentUser();
  const shouldSetupPassword =
    searchParams?.setup_password === "true" ||
    (currentUser?.profile?.hasPassword === false && !currentUser?.profile?.passwordSetupSkipped);

  if (!currentUser) {
    redirect("/login?redirect=/dashboard");
  }

  // If user is admin, perform a clean single redirect to the Admin Portal
  if (currentUser.profile.role === "admin") {
    redirect("/admin");
  }

  const userOrders = await getDashboardOrders(currentUser);

  return (
    <>
      <DashboardClient profile={currentUser.profile} orders={userOrders} />
      <SetPasswordModal isOpen={shouldSetupPassword} />
    </>
  );
}

