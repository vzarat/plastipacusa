import React from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { CreditApplicationContent } from "@/components/credit/CreditApplicationContent";

export const metadata: Metadata = {
  title: "Submit a B2B Credit Application | Plastipac USA",
  description:
    "Submit a Plastipac USA B2B credit application for commercial credit terms, PO checkout, and a dedicated credit line for verified corporate accounts.",
};

export default async function CreditApplicationPage() {
  const currentUser = await getCurrentUser();
  return (
    <CreditApplicationContent profile={currentUser?.profile ?? null} />
  );
}
