import React from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { CreditApplicationContent } from "@/components/credit/CreditApplicationContent";

export const metadata: Metadata = {
  title: "Apply for B2B Credit & Net 30 | Plastipac USA",
  description:
    "Apply for Plastipac USA B2B credit with Net 30 commercial terms, PO checkout, and dedicated lines of credit for verified corporate accounts.",
};

export default async function CreditApplicationPage() {
  const currentUser = await getCurrentUser();
  return (
    <CreditApplicationContent profile={currentUser?.profile ?? null} />
  );
}
