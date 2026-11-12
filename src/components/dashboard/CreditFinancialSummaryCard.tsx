"use client";

import Link from "next/link";
import { CreditCard, FileText, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface CreditFinancialSummary {
  creditLimit: number;
  availableCredit: number;
  pendingInvoiceCount: number;
  pendingInvoiceTotal: number;
  paymentTerms: string;
}

export function CreditFinancialSummaryCard({
  summary,
}: {
  summary: CreditFinancialSummary;
}) {
  return (
    <section className="w-full rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50/40 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">
            Commercial Credit
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
            Financial Summary
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {summary.paymentTerms || "Net 30"} · live available balance
          </p>
        </div>
        <Link
          href="/dashboard/credit"
          className="text-xs font-bold text-sky-700 hover:underline"
        >
          View credit status →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Total Credit Limit</span>
            <CreditCard className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {formatCurrency(summary.creditLimit)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Available Credit</span>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-800">
            {formatCurrency(summary.availableCredit)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Pending Invoices</span>
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {summary.pendingInvoiceCount}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {formatCurrency(summary.pendingInvoiceTotal)} unpaid
          </p>
        </div>
      </div>
    </section>
  );
}
