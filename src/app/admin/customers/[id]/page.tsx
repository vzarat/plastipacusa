import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCustomerDossier } from "@/actions/customers";
import { AdminCustomerDossierClient } from "@/components/admin/AdminCustomerDossierClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Expediente del Cliente | Plastipac USA Admin",
  description:
    "Inspect B2B customer tax exemption, EIN, and credit application dossier.",
};

interface AdminCustomerDossierPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDossierPage({
  params,
}: AdminCustomerDossierPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?redirect=/admin/customers/${id}`);
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const dossier = await getAdminCustomerDossier(id);
  if (!dossier) {
    notFound();
  }

  return (
    <AdminCustomerDossierClient
      profile={currentUser.profile}
      dossier={dossier}
    />
  );
}
