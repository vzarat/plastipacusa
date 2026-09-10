import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { SetPasswordModal } from "@/components/auth/SetPasswordModal";
import { DashboardClient, DashboardOrder } from "@/components/dashboard/DashboardClient";
import { createServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commercial Client Dashboard | Plastipac USA",
  description: "Manage recurring stretch film orders, review dispatch statuses, and trigger 1-click batch reorders.",
};

async function getDashboardOrders(currentUser: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!currentUser) {
    return [] as DashboardOrder[];
  }

  try {
    const supabase = createServerClient();

    const { data: dbOrders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !dbOrders) {
      return [] as DashboardOrder[];
    }

    const userEmail = currentUser.user.email?.toLowerCase();
    const companyName = currentUser.profile.companyName?.toLowerCase();

    return dbOrders
      .filter((row: any) => {
        const matchesUserId = row.user_id && row.user_id === currentUser.user.id;
        const matchesEmail = row.customer_email && userEmail && row.customer_email.toLowerCase() === userEmail;
        const matchesCompanyName =
          row.company_name && companyName && row.company_name.toLowerCase() === companyName;

        return matchesUserId || matchesEmail || matchesCompanyName;
      })
      .map((row: any) => {
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

