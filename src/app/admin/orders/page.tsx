import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminOrders } from "@/actions/admin";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Orders & Sales Operations | Plastipac USA",
  description: "Shopify-inspired commercial order fulfillment desk and B2B sales operations.",
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

  // Fetch all orders joined with customer profile info
  const orders = await getAdminOrders();

  return <AdminOrdersClient initialOrders={orders} profile={currentUser.profile} />;
}

