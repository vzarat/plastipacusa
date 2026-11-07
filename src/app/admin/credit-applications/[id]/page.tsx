import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCreditApplications } from "@/actions/credit-applications";
import { AdminCreditApplicationsClient } from "@/components/admin/AdminCreditApplicationsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Application Review | Plastipac USA Admin",
  description: "Review a B2B commercial credit application.",
};

interface AdminCreditApplicationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCreditApplicationDetailPage({
  params,
}: AdminCreditApplicationDetailPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?redirect=/admin/credit-applications/${id}`);
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const applications = await getAdminCreditApplications();

  return (
    <AdminCreditApplicationsClient
      profile={currentUser.profile}
      initialApplications={applications}
      initialSelectedId={id}
    />
  );
}
