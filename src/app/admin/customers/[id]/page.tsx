import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCustomerDossier } from "@/actions/customers";
import { AdminCustomerDossierClient } from "@/components/admin/AdminCustomerDossierClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer File | Plastipac USA Admin",
  description:
    "Inspect B2B customer registration profile, tax exemption, EIN, and credit dossier.",
};

interface AdminCustomerDossierPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDossierPage({
  params,
}: AdminCustomerDossierPageProps) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(String(rawId || "").trim());
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect(`/login?redirect=/admin/customers/${encodeURIComponent(id)}`);
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const dossier = await getAdminCustomerDossier(id);
  if (!dossier) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-black text-slate-900">Customer not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          No registration profile matches this id. The account may have been
          deleted, or the Customers list needs a refresh.
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-slate-400">{id}</p>
        <Link
          href="/admin?tab=customers"
          className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
        >
          Back to customers
        </Link>
      </div>
    );
  }

  return (
    <AdminCustomerDossierClient
      profile={currentUser.profile}
      dossier={dossier}
    />
  );
}
