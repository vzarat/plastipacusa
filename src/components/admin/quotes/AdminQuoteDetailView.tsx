"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, Download, Loader2, Mail, ExternalLink } from "lucide-react";
import { sendSalesQuoteEmail } from "@/actions/sales-quotes";
import { quoteMerchandiseTotal } from "@/lib/sales-quotes/totals";
import type { SalesQuoteRecord } from "@/lib/sales-quotes/types";

function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function AdminQuoteDetailView({
  quote,
  acceptUrl,
}: {
  quote: SalesQuoteRecord;
  acceptUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(quote);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(acceptUrl);
      toast.success("Accept link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const sendEmail = () => {
    startTransition(async () => {
      const result = await sendSalesQuoteEmail(current.id);
      if (!result.success) {
        toast.error(result.error || "Email failed.");
        return;
      }
      setCurrent((prev) => ({
        ...prev,
        status: prev.status === "draft" ? "sent" : prev.status,
        sentAt: new Date().toISOString(),
      }));
      toast.success(`Quote emailed to ${current.email}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {current.status}
          </p>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {current.quoteNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {[current.companyName || current.contactName || "Prospect", current.phone, current.email]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/quotes/${current.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            Print / PDF
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy accept link
          </button>
          <a
            href={acceptUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open accept page
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={sendEmail}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            Send Quote via Email
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2 text-sm lg:col-span-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Line items
          </h2>
          <div className="divide-y divide-slate-100">
            {current.items.map((line, index) => (
              <div key={`${line.sku}-${index}`} className="py-3 flex justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{line.productName}</p>
                  <p className="text-[12px] text-slate-500">
                    {line.tierLabel} · {line.sku} · qty {line.quantity}
                  </p>
                </div>
                <p className="font-semibold text-slate-900">{money(line.lineTotal)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2 text-sm">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Summary
          </h2>
          <Row label="Subtotal" value={money(current.subtotal)} />
          <Row label="Discount" value={`-${money(current.discountAmount)}`} />
          <Row
            label="Quote total"
            value={money(quoteMerchandiseTotal(current))}
            strong
          />
          {current.freightSummary?.mode === "customer_arranged" ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-950 space-y-1">
              <p className="font-bold uppercase tracking-wider text-[10px] text-sky-800">
                Customer-arranged freight
              </p>
              <p>
                Suggested Warp:{" "}
                <span className="font-bold">
                  {money(Number(current.freightSummary.suggestedAmount || 0))}
                </span>
              </p>
              {current.freightSummary.suggestedLabel ? (
                <p className="text-sky-900/80">{current.freightSummary.suggestedLabel}</p>
              ) : null}
            </div>
          ) : current.shippingAmount > 0 ? (
            <Row label="Freight on file" value={money(current.shippingAmount)} />
          ) : null}
          <p className="text-[11px] text-slate-500 pt-1">
            {current.freightSummary?.mode === "customer_arranged"
              ? "PDF shows merchandise + Warp freight suggestion (not billed by Plastipac)."
              : "PDF shows merchandise only. Tax and shipping are calculated at checkout."}
          </p>
          <div className="pt-3 border-t border-slate-100 space-y-1 text-[12px] text-slate-600">
            <p>Terms: {current.paymentTerms === "net_30" ? "Net 30" : "Prepayment"}</p>
            <p>Valid: {new Date(current.validUntil).toLocaleDateString("en-US")}</p>
            <p>
              Pallets {current.palletCount.toFixed(2)}
              {current.weightLbs > 0
                ? ` · Weight ${current.weightLbs.toLocaleString("en-US")} lbs`
                : ""}
            </p>
            {current.sentAt ? (
              <p>Sent: {new Date(current.sentAt).toLocaleString("en-US")}</p>
            ) : null}
          </div>
          {current.notes ? (
            <p className="pt-2 text-[12px] text-slate-600 border-t border-slate-100">
              {current.notes}
            </p>
          ) : null}
        </div>
      </div>

      <Link href="/admin/quotes" className="text-sm font-bold text-sky-700 hover:underline">
        ← Back to quotes
      </Link>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        strong ? "font-black text-slate-900 pt-2 border-t border-slate-200" : "text-slate-700"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
