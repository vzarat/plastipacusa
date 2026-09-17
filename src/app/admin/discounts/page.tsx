import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { AdminDiscountsClient } from "@/components/admin/AdminDiscountsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Discounts | Plastipac USA",
  description: "Manage discount and promo codes for Plastipac USA.",
};

export default async function AdminDiscountsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/admin/discounts");
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminDiscountsClient profile={currentUser.profile} />;
}
