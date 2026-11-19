import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { getAdminCustomers } from "@/actions/admin";
import { getAdminProducts } from "@/actions/products";
import { AdminQuotesShell } from "@/components/admin/quotes/AdminQuotesShell";
import { AdminQuoteForm } from "@/components/admin/quotes/AdminQuoteForm";

export const metadata: Metadata = {
  title: "New Sales Quote | Plastipac USA Admin",
  description: "Build a B2B PDF quotation with freight and terms.",
};

export default async function AdminNewQuotePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/quotes/new");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const [customers, products] = await Promise.all([
    getAdminCustomers(),
    getAdminProducts(),
  ]);

  return (
    <AdminQuotesShell profile={currentUser.profile} title="New Quote">
      <AdminQuoteForm
        customers={customers}
        products={products as unknown as Array<Record<string, unknown>>}
      />
    </AdminQuotesShell>
  );
}
