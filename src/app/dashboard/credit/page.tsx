import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getMyCreditStatus } from "@/actions/credit-applications";
import { DashboardCreditClient } from "@/components/dashboard/DashboardCreditClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commercial Credit | Plastipac USA Dashboard",
  description:
    "Apply for Plastipac USA Net 30 commercial credit terms from your customer dashboard.",
};

export default async function DashboardCreditPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/dashboard/credit");
  }

  if (currentUser.profile.role === "admin") {
    redirect("/admin");
  }

  const creditStatus = await getMyCreditStatus();

  return (
    <DashboardCreditClient
      profile={currentUser.profile}
      creditStatus={creditStatus}
    />
  );
}
