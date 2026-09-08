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

export default async function AdminIndexPage() {
  const currentUser = await getCurrentUser();

  // If unauthenticated -> redirect to /login
  if (!currentUser) {
    redirect("/login?redirect=/admin");
  }

  // If profile.role !== 'admin' -> redirect to /dashboard
  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  // If profile.role === 'admin' -> RENDER the admin dashboard (DO NOT REDIRECT)
  const orders = await getAdminOrders();

  return <AdminOrdersClient initialOrders={orders} profile={currentUser.profile} />;
}
