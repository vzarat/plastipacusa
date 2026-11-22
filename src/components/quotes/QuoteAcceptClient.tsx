"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShoppingCart } from "lucide-react";
import { markSalesQuoteAccepted } from "@/actions/sales-quotes";
import { quoteMerchandiseTotal } from "@/lib/sales-quotes/totals";
import { useCartStore } from "@/lib/store/useCartStore";
import type { SalesQuoteRecord } from "@/lib/sales-quotes/types";

function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function QuoteAcceptClient({ quote }: { quote: SalesQuoteRecord }) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [pending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(quote.status === "accepted");
  const expired = quote.status === "expired" || new Date(quote.validUntil).getTime() < Date.now();

  const convertToOrder = () => {
    if (expired) {
      toast.error("This quote has expired.");
      return;
    }
    startTransition(async () => {
      const result = await markSalesQuoteAccepted(quote.token);
      if (!result.success) {
        toast.error(result.error || "Could not accept quote.");
        return;
      }
      for (const line of quote.items) {
        addItem({
          productId: Number.parseInt(String(line.productId).replace(/\D/g, "").slice(0, 8) || "0", 10) || 0,
          productSlug: line.productSlug,
          productName: line.productName,
          productImage: line.productImage || "",
          packageSize: line.tierLabel,
          totalRolls: line.rollsPerPackage,
          totalBoxes: line.boxesPerPackage,
          application: line.application,
          variantId: line.sku,
          sku: line.sku,
          widthInches: line.widthInches,
          gauge: line.gauge,
          lengthFeet: line.lengthFeet,
          rollsPerBox: line.application === "machine" ? line.rollsPerPackage : 4,
          rollsPerPallet: line.application === "machine" ? 40 : 192,
          weightLbs: String(line.weightLbs || ""),
          pricingTier: line.tierKey,
          tierType:
            line.tierKey === "box"
              ? "box"
              : line.tierKey === "half"
                ? "half_pallet"
                : "full_pallet",
          unitPrice: line.unitPrice,
          boxUnitPrice: line.boxUnitPrice ?? undefined,
          quantity: line.quantity,
        });
      }
      setAccepted(true);
      toast.success("Quote added to your cart.");
      router.push("/checkout");
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-sky-700 px-6 py-5 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-100">
            Plastipac USA Quotation
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{quote.quoteNumber}</h1>
          <p className="mt-1 text-sm text-sky-100">
            Prepared for{" "}
            {quote.companyName || quote.contactName || quote.phone || "you"} · Valid through{" "}
            {new Date(quote.validUntil).toLocaleDateString("en-US")}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer</p>
              <p className="font-semibold text-slate-900">
                {quote.companyName || quote.contactName || "Prospect"}
              </p>
              {quote.companyName && quote.contactName ? (
                <p className="text-slate-600">{quote.contactName}</p>
              ) : null}
              {quote.phone ? <p className="text-slate-600">{quote.phone}</p> : null}
              {quote.email ? <p className="text-slate-600">{quote.email}</p> : null}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Ship to</p>
              <p className="text-slate-700">
                {quote.shippingZip
                  ? `ZIP ${quote.shippingZip}${
                      quote.shippingCity ? ` · ${quote.shippingCity}` : ""
                    }${quote.shippingState ? `, ${quote.shippingState}` : ""}`
                  : "Shipping address collected at checkout"}
              </p>
              <p className="text-slate-700">
                Terms: {quote.paymentTerms === "net_30" ? "Net 30" : "Prepayment"}
              </p>
              <p className="text-slate-700">
                Shipping &amp; tax: calculated at checkout
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {quote.items.map((line, index) => (
              <div key={`${line.sku}-${index}`} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{line.productName}</p>
                  <p className="text-[12px] text-slate-500">
                    {line.tierLabel} · qty {line.quantity}
                  </p>
                </div>
                <p className="font-semibold">{money(line.lineTotal)}</p>
              </div>
            ))}
          </div>

          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal</span>
              <span>{money(quote.subtotal)}</span>
            </div>
            {quote.discountAmount > 0 ? (
              <div className="flex justify-between text-slate-700">
                <span>Discount</span>
                <span>-{money(quote.discountAmount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between font-black text-slate-900 border-t border-slate-200 pt-2">
              <span>Quote total (USD)</span>
              <span>{money(quoteMerchandiseTotal(quote))}</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-2">
              Sales tax and shipping are calculated at checkout. Freight is quoted through
              multiple carriers on our site.
            </p>
          </div>

          {expired ? (
            <p className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
              This quote has expired. Contact Plastipac USA for an updated quotation.
            </p>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={convertToOrder}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              {accepted ? "Added — continue to checkout" : "Accept quote & order online"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
