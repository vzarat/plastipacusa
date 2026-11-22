"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { SalesQuoteRecord } from "@/lib/sales-quotes/types";

function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusClass(status: string) {
  switch (status) {
    case "sent":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "viewed":
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    case "accepted":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "expired":
    case "cancelled":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-amber-50 text-amber-800 border-amber-200";
  }
}

export function AdminQuotesListView({ quotes }: { quotes: SalesQuoteRecord[] }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Sales Quotes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Build PDF quotations, email customers, and share a 1-click accept link.
          </p>
        </div>
        <Link
          href="/admin/quotes/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
        >
          <Plus className="w-4 h-4" />
          New Quote
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Quote</th>
                <th className="px-4 py-3 font-bold">Customer</th>
                <th className="px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3 font-bold">Terms</th>
                <th className="px-4 py-3 font-bold">Valid</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No quotes yet. Create the first quotation for a customer or prospect.
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quotes/${quote.id}`}
                        className="font-bold text-sky-700 hover:underline"
                      >
                        {quote.quoteNumber}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {new Date(quote.createdAt).toLocaleDateString("en-US")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {quote.companyName || quote.contactName || quote.phone || "Prospect"}
                      </p>
                      <p className="text-[12px] text-slate-500">
                        {[quote.contactName && quote.companyName ? quote.contactName : null, quote.email || quote.phone]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {money(Math.max(0, quote.subtotal - quote.discountAmount))}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {quote.paymentTerms === "net_30" ? "Net 30" : "Prepay"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(quote.validUntil).toLocaleDateString("en-US")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize ${statusClass(
                          quote.status
                        )}`}
                      >
                        {quote.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
