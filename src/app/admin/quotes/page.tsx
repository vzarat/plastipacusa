import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { listSalesQuotes } from "@/actions/sales-quotes";
import { AdminQuotesShell } from "@/components/admin/quotes/AdminQuotesShell";
import { AdminQuotesListView } from "@/components/admin/quotes/AdminQuotesListView";

export const metadata: Metadata = {
  title: "Sales Quotes | Plastipac USA Admin",
  description: "Create, email, and track B2B PDF sales quotations.",
};

export default async function AdminQuotesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/quotes");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const quotes = await listSalesQuotes();

  return (
    <AdminQuotesShell profile={currentUser.profile} title="Sales Quotes">
      <AdminQuotesListView quotes={quotes} />
    </AdminQuotesShell>
  );
}
