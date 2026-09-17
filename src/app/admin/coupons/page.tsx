import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { AdminCouponsClient } from "@/components/admin/AdminCouponsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Coupons | Plastipac USA",
  description: "Manage promo codes and percentage discounts for Plastipac USA.",
};

export default async function AdminCouponsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/admin/coupons");
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminCouponsClient profile={currentUser.profile} />;
}
