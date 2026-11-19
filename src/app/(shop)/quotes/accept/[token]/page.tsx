import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSalesQuoteByToken } from "@/actions/sales-quotes";
import { QuoteAcceptClient } from "@/components/quotes/QuoteAcceptClient";

export const metadata: Metadata = {
  title: "Accept Quote | Plastipac USA",
  description: "Review your Plastipac USA quotation and convert it to an online order.",
};

export default async function QuoteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await getSalesQuoteByToken(token);
  if (!quote) notFound();

  return <QuoteAcceptClient quote={quote} />;
}
