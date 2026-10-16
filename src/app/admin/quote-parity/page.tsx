import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { QuoteParityClient } from "@/components/admin/QuoteParityClient";

export const metadata: Metadata = {
  title: "Quote parity | Plastipac USA",
  description: "Compare a Warp quote with the shipment checkout sends.",
};

export default async function QuoteParityPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/quote-parity");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");
  return <QuoteParityClient />;
}
