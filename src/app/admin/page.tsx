import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCustomers, getAdminOrders } from "@/actions/admin";
import { getAdminProducts } from "@/actions/products";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Orders | Plastipac USA",
  description: "Customer order management dashboard for Plastipac USA.",
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
  const [orders, customers, products] = await Promise.all([
    getAdminOrders(),
    getAdminCustomers(),
    getAdminProducts(),
  ]);

  return (
    <AdminOrdersClient
      initialOrders={orders}
      profile={currentUser.profile}
      customers={customers}
      initialProducts={products}
    />
  );
}

