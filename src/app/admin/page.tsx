import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCustomers, getAdminOrders } from "@/actions/admin";
import { getAdminProducts } from "@/actions/products";
import { AdminOrdersClient } from "@/components/admin/AdminOrdersClient";
import type { AdminTabKey } from "@/components/admin/AdminSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Orders | Plastipac USA",
  description: "Customer order management dashboard for Plastipac USA.",
};

const VALID_TABS: AdminTabKey[] = [
  "overview",
  "orders",
  "products",
  "customers",
  "settings",
];

function resolveInitialTab(tab: string | string[] | undefined): AdminTabKey {
  const value = Array.isArray(tab) ? tab[0] : tab;
  if (value && VALID_TABS.includes(value as AdminTabKey)) {
    return value as AdminTabKey;
  }
  return "overview";
}

export default async function AdminIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; section?: string | string[] }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/admin");
  }

  if (currentUser.profile.role === "warehouse_supervisor") {
    redirect("/admin/inventory/usa");
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const initialTab = resolveInitialTab(params.tab);
  const sectionRaw = Array.isArray(params.section)
    ? params.section[0]
    : params.section;
  const settingsSection =
    sectionRaw === "email-templates" || sectionRaw === "users"
      ? sectionRaw
      : undefined;

  // Only fetch what the landing tab needs — catalog/customers load on demand.
  const needsCustomers = initialTab === "customers" || initialTab === "overview";
  const needsProducts = initialTab === "products";

  const [orders, customers, products] = await Promise.all([
    getAdminOrders(),
    needsCustomers ? getAdminCustomers() : Promise.resolve([]),
    needsProducts ? getAdminProducts() : Promise.resolve([]),
  ]);

  return (
    <AdminOrdersClient
      initialOrders={orders}
      profile={currentUser.profile}
      customers={customers}
      initialProducts={products}
      initialTab={initialTab}
      settingsSection={settingsSection}
      deferCustomers={!needsCustomers}
      deferProducts={!needsProducts}
    />
  );
}
