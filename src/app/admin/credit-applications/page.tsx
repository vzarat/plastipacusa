import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCreditApplications } from "@/actions/credit-applications";
import { AdminCreditApplicationsClient } from "@/components/admin/AdminCreditApplicationsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Applications | Plastipac USA Admin",
  description:
    "Review and manage B2B credit applications for Net 30 commercial terms.",
};

export default async function AdminCreditApplicationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/admin/credit-applications");
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const applications = await getAdminCreditApplications();

  return (
    <AdminCreditApplicationsClient
      profile={currentUser.profile}
      initialApplications={applications}
    />
  );
}
