import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCustomers, getAdminOrders } from "@/actions/admin";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Orders | Plastipac USA",
  description: "Customer order fulfillment desk for Plastipac USA.",
};

export default async function AdminOrdersPage() {
  const currentUser = await getCurrentUser();

  // If unauthenticated, redirect to login with return path
  if (!currentUser) {
    redirect("/login?redirect=/admin/orders");
  }

  // If authenticated but not an admin, restrict access to client dashboard
  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all orders and the registered customer directory
  const [orders, customers] = await Promise.all([getAdminOrders(), getAdminCustomers()]);

  return (
    <AdminOrdersClient
      initialOrders={orders}
      profile={currentUser.profile}
      customers={customers}
      initialTab="orders"
    />
  );
}

