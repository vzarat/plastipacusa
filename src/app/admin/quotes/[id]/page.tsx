import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { getSalesQuote } from "@/actions/sales-quotes";
import { getAppBaseUrl } from "@/lib/email";
import { AdminQuotesShell } from "@/components/admin/quotes/AdminQuotesShell";
import { AdminQuoteDetailView } from "@/components/admin/quotes/AdminQuoteDetailView";

export const metadata: Metadata = {
  title: "Quote Detail | Plastipac USA Admin",
};

export default async function AdminQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/quotes");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const quote = await getSalesQuote(id);
  if (!quote) notFound();

  const acceptUrl = `${getAppBaseUrl()}/quotes/accept/${quote.token}`;

  return (
    <AdminQuotesShell profile={currentUser.profile} title={quote.quoteNumber}>
      <AdminQuoteDetailView quote={quote} acceptUrl={acceptUrl} />
    </AdminQuotesShell>
  );
}
