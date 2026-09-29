import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { AdminEmailTemplatesClient } from "@/components/admin/AdminEmailTemplatesClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Email Templates | Plastipac USA Admin",
  description:
    "Configure and test Plastipac USA order confirmation emails via Resend.",
};

export default async function AdminEmailTemplatesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/admin/email-templates");
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminEmailTemplatesClient profile={currentUser.profile} />;
}
