"use client";

import { useState } from "react";
import { runQuoteParity, type QuoteParityResult } from "@/actions/quote-parity";
import { PRICE_DIFFERENCE_NOTES } from "@/lib/shipping/price-difference-notes";

export function QuoteParityClient() {
  const [result, setResult] = useState<QuoteParityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pasted, setPasted] = useState("");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const response = await runQuoteParity({
      destinationZip: String(formData.get("zip") || ""),
      sku: String(formData.get("sku") || ""),
      quantity: Number(formData.get("quantity") || 1),
      pickupDate: String(formData.get("pickup") || ""),
      accessorials: String(formData.get("accessorials") || ""),
      pasted,
    });
    setPending(false);
    if ("error" in response) {
      setResult(null);
      setError(response.error);
      return;
    }
    setResult(response);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900">Warp quote parity</h1>
      <p className="text-sm text-slate-600">
        Markup applied on the site: {result?.markupPercent ?? 0}%. The request block is what to type into Warp.
      </p>
      <form action={onSubmit} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-sm font-semibold text-slate-700">
          Destination ZIP
          <input name="zip" defaultValue="32801" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Product SKU
          <input name="sku" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Quantity
          <input name="quantity" type="number" min={1} defaultValue={1} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Pickup date
          <input name="pickup" type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Accessorials
          <input name="accessorials" placeholder="liftgate-delivery, residential-delivery" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="h-10 rounded-lg bg-slate-900 text-sm font-bold text-white">
          {pending ? "Quoting..." : "Build request and quote"}
        </button>
      </form>
      {error && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{error}</p>}
      {result && (
        <section className="space-y-4">
          <p className="text-sm text-slate-600">Pickup date used: {result.pickupDate}</p>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-white">{result.requestText}</pre>
          <div>
            <h2 className="text-sm font-black text-slate-900">Warp options</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {result.warpOptions.map((option) => (
                <li key={`${option.carrier}-${option.service}-${option.price}`}>
                  {option.carrier} · {option.service} · ${option.price.toFixed(2)} · {option.transitDays ?? "?"} days · bookable {String(option.bookable)} · cached {String(result.cached)}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">Checkout would show</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {result.checkoutOptions.map((option) => (
                <li key={option.quoteId}>
                  {option.carrierName || option.serviceLevel} · {option.serviceLevel} · ${option.price.toFixed(2)} customer · ${option.carrierPrice.toFixed(2)} carrier
                </li>
              ))}
            </ul>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Paste Warp tool prices (carrier, service, price)
            <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" />
          </label>
          {result.diff.length > 0 && (
            <ul className="space-y-1 text-sm">
              {result.diff.map((row) => (
                <li key={`${row.carrier}-${row.service}`}>
                  {row.status}: {row.carrier} {row.service}
                  {row.difference != null ? ` (${row.difference > 0 ? "+" : ""}${row.difference.toFixed(2)})` : ""}
                </li>
              ))}
            </ul>
          )}
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
            {PRICE_DIFFERENCE_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
