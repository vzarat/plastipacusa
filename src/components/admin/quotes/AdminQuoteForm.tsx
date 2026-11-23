"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { AdminCustomer } from "@/actions/admin";
import {
  createSalesQuote,
  previewSalesQuoteFreight,
} from "@/actions/sales-quotes";
import {
  buildQuoteCatalogOptions,
  toSalesQuoteLineInput,
} from "@/lib/sales-quotes/catalog-options";
import type { SalesQuoteLineInput, SalesQuotePaymentTerms } from "@/lib/sales-quotes/types";
import { priceSalesQuoteLines, salesQuoteTotals } from "@/lib/sales-quotes/totals";

function defaultValidUntil(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type DraftLine = SalesQuoteLineInput & { key: string };

type FieldKey =
  | "customerUserId"
  | "contactName"
  | "phone"
  | "email"
  | "shippingZip"
  | "validUntil"
  | "lines";

type FieldErrors = Partial<Record<FieldKey, string>>;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AdminQuoteForm({
  customers,
  products,
}: {
  customers: AdminCustomer[];
  products: Array<Record<string, unknown>>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const catalog = useMemo(() => buildQuoteCatalogOptions(products), [products]);

  const [customerMode, setCustomerMode] = useState<"existing" | "prospect">("prospect");
  const [customerUserId, setCustomerUserId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");

  useEffect(() => {
    const company = searchParams.get("company");
    const contact = searchParams.get("contact");
    const emailParam = searchParams.get("email");
    const phoneParam = searchParams.get("phone");
    const zip = searchParams.get("zip");
    const city = searchParams.get("city");
    const state = searchParams.get("state");
    if (!company && !contact && !emailParam && !phoneParam && !zip) return;
    setCustomerMode("prospect");
    if (company) setCompanyName(company);
    if (contact) setContactName(contact);
    if (emailParam) setEmail(emailParam);
    if (phoneParam) setPhone(phoneParam);
    if (zip) setShippingZip(zip);
    if (city) setShippingCity(city);
    if (state) setShippingState(state);
  }, [searchParams]);
  const [paymentTerms, setPaymentTerms] = useState<SalesQuotePaymentTerms>("prepayment");
  const [validUntil, setValidUntil] = useState(defaultValidUntil());
  const [notes, setNotes] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [shippingOverride, setShippingOverride] = useState<string>("");
  const [taxExempt, setTaxExempt] = useState(false);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(catalog[0]?.id || "");
  const [selectedSku, setSelectedSku] = useState(catalog[0]?.options[0]?.sku || "");
  const [lineQty, setLineQty] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [freightPreview, setFreightPreview] = useState<{
    shippingAmount: number;
    shippingMethod: string;
    weightLbs: number;
    palletCount: number;
  } | null>(null);

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const validateQuote = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedContact = contactName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();
    const zipDigits = shippingZip.match(/\d{5}/)?.[0] || "";

    if (customerMode === "existing" && !customerUserId) {
      next.customerUserId = "Select a customer or switch to Prospect.";
    }
    if (!trimmedContact && !trimmedPhone) {
      next.contactName = "Add a contact name or phone.";
      next.phone = "Add a contact name or phone.";
    }
    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      next.email = "Enter a valid email address.";
    }
    if (shippingZip.trim() && !zipDigits) {
      next.shippingZip = "Enter a valid 5-digit ZIP, or leave blank.";
    }
    const until = new Date(`${validUntil}T23:59:59`);
    if (!validUntil || !Number.isFinite(until.getTime()) || until.getTime() <= Date.now()) {
      next.validUntil = "Choose a future validity date.";
    }
    if (lines.length === 0) {
      next.lines = "Add at least one product line.";
    }
    return next;
  };

  const selectedProduct = catalog.find((product) => product.id === selectedProductId) || null;
  const selectedOption =
    selectedProduct?.options.find((option) => option.sku === selectedSku) ||
    selectedProduct?.options[0] ||
    null;

  const liveLines = priceSalesQuoteLines(lines);
  const liveTotals = salesQuoteTotals({
    lines: liveLines,
    discountPercent,
    shipping: freightPreview?.shippingAmount ?? (Number(shippingOverride) || 0),
    taxExempt,
  });

  const onSelectCustomer = (id: string) => {
    setCustomerUserId(id);
    clearFieldError("customerUserId");
    const customer = customers.find((row) => row.id === id);
    if (!customer) return;
    setCompanyName(customer.companyName || "");
    setContactName(customer.contactName || "");
    setEmail(customer.email || "");
    setPhone(customer.phone || "");
    clearFieldError("contactName");
    clearFieldError("phone");
    clearFieldError("email");
    setTaxExempt(Boolean(customer.taxExempt));
    if (customer.creditApplicationStatus === "approved") {
      setPaymentTerms("net_30");
    }
  };

  const addLine = () => {
    if (!selectedProduct || !selectedOption) {
      toast.error("Choose a product tier first.");
      return;
    }
    const next = toSalesQuoteLineInput(selectedProduct, selectedOption, lineQty);
    setLines((current) => [
      ...current,
      { ...next, key: `${next.sku}-${Date.now()}-${Math.random()}` },
    ]);
    clearFieldError("lines");
    setFreightPreview(null);
  };

  const removeLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
    setFreightPreview(null);
  };

  const runFreightPreview = () => {
    startTransition(async () => {
      const result = await previewSalesQuoteFreight({
        companyName,
        contactName,
        email,
        phone,
        shippingZip,
        shippingCity,
        shippingState,
        paymentTerms,
        validUntil,
        items: lines,
        discountPercent,
        shippingAmountOverride: shippingOverride === "" ? null : Number(shippingOverride),
        taxExempt,
      });
      if (!result.success || !result.totals) {
        toast.error(result.error || "Freight preview failed.");
        return;
      }
      setFreightPreview({
        shippingAmount: result.shippingAmount || 0,
        shippingMethod: result.shippingMethod || "Freight",
        weightLbs: result.weightLbs || 0,
        palletCount: result.palletCount || result.totals.palletCount,
      });
      toast.success("Freight preview updated.");
    });
  };

  const saveQuote = () => {
    const errors = validateQuote();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const first = Object.values(errors)[0];
      toast.error(first || "Fix the highlighted fields.");
      return;
    }

    startTransition(async () => {
      const result = await createSalesQuote({
        customerUserId: customerMode === "existing" ? customerUserId || null : null,
        companyName,
        contactName,
        email,
        phone,
        shippingZip,
        shippingCity,
        shippingState,
        paymentTerms,
        validUntil: new Date(`${validUntil}T23:59:59`).toISOString(),
        notes,
        items: lines,
        discountPercent,
        shippingAmountOverride: shippingOverride === "" ? null : Number(shippingOverride),
        shippingMethodOverride:
          shippingOverride === "" ? null : "Manual freight override",
        taxExempt,
      });
      if (!result.success || !result.quote) {
        const message = result.error || "Could not save quote.";
        const serverErrors: FieldErrors = {};
        if (/contact name or phone/i.test(message)) {
          serverErrors.contactName = message;
          serverErrors.phone = message;
        } else if (/email/i.test(message)) {
          serverErrors.email = message;
        } else if (/zip/i.test(message)) {
          serverErrors.shippingZip = message;
        } else if (/valid/i.test(message)) {
          serverErrors.validUntil = message;
        } else if (/product line/i.test(message)) {
          serverErrors.lines = message;
        }
        if (Object.keys(serverErrors).length > 0) setFieldErrors(serverErrors);
        toast.error(message);
        return;
      }
      setFieldErrors({});
      toast.success(`Saved ${result.quote.quoteNumber}`);
      router.push(`/admin/quotes/${result.quote.id}`);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">New Sales Quote</h1>
        <p className="mt-1 text-sm text-slate-600">
          For prospects you only need a contact name or phone. Company, email, and ZIP are optional
          until you have them. Free Local Delivery still uses the live 3+ pallet Houston/RGV rule when
          a ZIP is entered.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCustomerMode("existing")}
            className={`rounded-xl px-3 py-2 text-xs font-bold border ${
              customerMode === "existing"
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            Existing customer
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomerMode("prospect");
              setCustomerUserId("");
            }}
            className={`rounded-xl px-3 py-2 text-xs font-bold border ${
              customerMode === "prospect"
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            Prospect
          </button>
        </div>

        {customerMode === "existing" ? (
          <label className="block text-sm">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                fieldErrors.customerUserId ? "text-rose-600" : "text-slate-500"
              }`}
            >
              Customer
            </span>
            <select
              value={customerUserId}
              onChange={(event) => onSelectCustomer(event.target.value)}
              aria-invalid={Boolean(fieldErrors.customerUserId)}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${
                fieldErrors.customerUserId
                  ? "border-rose-500 bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  : "border-slate-200"
              }`}
            >
              <option value="">Select a customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.companyName} — {customer.email}
                </option>
              ))}
            </select>
            {fieldErrors.customerUserId ? (
              <p className="mt-1 text-xs font-medium text-rose-600">
                {fieldErrors.customerUserId}
              </p>
            ) : null}
          </label>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Contact name"
            value={contactName}
            error={fieldErrors.contactName}
            onChange={(value) => {
              setContactName(value);
              clearFieldError("contactName");
              if (value.trim()) clearFieldError("phone");
            }}
          />
          <Field
            label="Phone"
            value={phone}
            error={fieldErrors.phone}
            onChange={(value) => {
              setPhone(value);
              clearFieldError("phone");
              if (value.trim()) clearFieldError("contactName");
            }}
          />
          <Field
            label="Company (optional)"
            value={companyName}
            onChange={setCompanyName}
          />
          <Field
            label="Email (optional)"
            value={email}
            error={fieldErrors.email}
            onChange={(value) => {
              setEmail(value);
              clearFieldError("email");
            }}
            type="email"
          />
          <Field
            label="Shipping ZIP (optional)"
            value={shippingZip}
            error={fieldErrors.shippingZip}
            onChange={(value) => {
              setShippingZip(value);
              clearFieldError("shippingZip");
            }}
          />
          <Field label="City (optional)" value={shippingCity} onChange={setShippingCity} />
          <Field label="State (optional)" value={shippingState} onChange={setShippingState} />
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Payment terms
            </span>
            <select
              value={paymentTerms}
              onChange={(event) =>
                setPaymentTerms(event.target.value as SalesQuotePaymentTerms)
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="prepayment">Prepayment</option>
              <option value="net_30">Net 30</option>
            </select>
          </label>
          <label className="block text-sm">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                fieldErrors.validUntil ? "text-rose-600" : "text-slate-500"
              }`}
            >
              Valid until
            </span>
            <input
              type="date"
              value={validUntil}
              onChange={(event) => {
                setValidUntil(event.target.value);
                clearFieldError("validUntil");
              }}
              aria-invalid={Boolean(fieldErrors.validUntil)}
              className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${
                fieldErrors.validUntil
                  ? "border-rose-500 bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  : "border-slate-200"
              }`}
            />
            {fieldErrors.validUntil ? (
              <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.validUntil}</p>
            ) : null}
          </label>
          <label className="block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Volume discount %
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={discountPercent}
              onChange={(event) => setDiscountPercent(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={taxExempt}
            onChange={(event) => setTaxExempt(event.target.checked)}
          />
          Tax exempt (estimate tax as $0)
        </label>

        <label className="block text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Notes
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            placeholder="Lead time, special instructions, acceptance notes…"
          />
        </label>
      </section>

      <section
        className={`rounded-2xl bg-white p-4 sm:p-6 shadow-sm space-y-4 border ${
          fieldErrors.lines ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            className={`text-sm font-black uppercase tracking-wider ${
              fieldErrors.lines ? "text-rose-700" : "text-slate-800"
            }`}
          >
            Products
          </h2>
          {fieldErrors.lines ? (
            <p className="text-xs font-medium text-rose-600">{fieldErrors.lines}</p>
          ) : null}
        </div>
        <div className="grid gap-3 lg:grid-cols-12">
          <label className="lg:col-span-5 block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Product
            </span>
            <select
              value={selectedProductId}
              onChange={(event) => {
                const next = catalog.find((product) => product.id === event.target.value);
                setSelectedProductId(event.target.value);
                setSelectedSku(next?.options[0]?.sku || "");
              }}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {catalog.map((product) => (
                <option key={product.id} value={product.id}>
                  [{product.application === "machine" ? "Auto" : "Manual"}] {product.name}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-4 block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tier
            </span>
            <select
              value={selectedOption?.sku || ""}
              onChange={(event) => setSelectedSku(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              {(selectedProduct?.options || []).map((option) => (
                <option key={option.sku} value={option.sku}>
                  {option.tierLabel} — {money(option.unitPrice)}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-1 block text-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Qty
            </span>
            <input
              type="number"
              min={1}
              value={lineQty}
              onChange={(event) => setLineQty(Math.max(1, Number(event.target.value) || 1))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </label>
          <div className="lg:col-span-2 flex items-end">
            <button
              type="button"
              onClick={addLine}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit</th>
                <th className="px-3 py-2 text-right">Line</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {liveLines.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    No lines yet.
                  </td>
                </tr>
              ) : (
                liveLines.map((line, index) => (
                  <tr key={lines[index]?.key || line.sku} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{line.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        {line.tierLabel} · {line.sku}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right">{line.quantity}</td>
                    <td className="px-3 py-2 text-right">{money(line.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {money(line.lineTotal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(lines[index]?.key || "")}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Freight & totals
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Leave freight override blank to use Free Local (3+ pallets Houston/RGV) or Warp LTL.
            </p>
          </div>
          <button
            type="button"
            disabled={pending || lines.length === 0}
            onClick={runFreightPreview}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Preview freight
          </button>
        </div>

        <label className="block text-sm max-w-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Freight override (USD)
          </span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={shippingOverride}
            onChange={(event) => {
              setShippingOverride(event.target.value);
              setFreightPreview(null);
            }}
            placeholder="Auto"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </label>

        {freightPreview ? (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 space-y-1">
            <p>
              <span className="font-semibold">Method:</span> {freightPreview.shippingMethod}
            </p>
            <p>
              <span className="font-semibold">Pallets:</span>{" "}
              {freightPreview.palletCount.toFixed(2)} ·{" "}
              <span className="font-semibold">Weight:</span>{" "}
              {freightPreview.weightLbs.toLocaleString("en-US")} lbs
            </p>
          </div>
        ) : null}

        <div className="ml-auto max-w-sm space-y-1 text-sm">
          <Row label="Subtotal" value={money(liveTotals.subtotal)} />
          <Row label="Discount" value={`-${money(liveTotals.discount)}`} />
          <Row label="Freight" value={money(liveTotals.shipping)} />
          <Row label="Est. tax" value={money(liveTotals.tax)} />
          <Row label="Total" value={money(liveTotals.total)} strong />
          <p className="text-[11px] text-slate-500 pt-1">
            Est. pallets: {liveTotals.palletCount.toFixed(2)}
          </p>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={saveQuote}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save quote
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block text-sm">
      <span
        className={`text-xs font-bold uppercase tracking-wider ${
          error ? "text-rose-600" : "text-slate-500"
        }`}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${
          error
            ? "border-rose-500 bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200"
            : "border-slate-200"
        }`}
      />
      {error ? <p className="mt-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </label>
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
    <div className={`flex justify-between ${strong ? "font-black text-slate-900 pt-2 border-t border-slate-200" : "text-slate-700"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
