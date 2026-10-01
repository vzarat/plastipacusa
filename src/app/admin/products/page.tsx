import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCustomers, getAdminOrders } from "@/actions/admin";
import { getAdminProducts } from "@/actions/products";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Products | Plastipac USA",
  description: "Manage product availability and catalog for Plastipac USA.",
};

export default async function AdminProductsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/admin/products");
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

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
      initialTab="products"
    />
  );
}
