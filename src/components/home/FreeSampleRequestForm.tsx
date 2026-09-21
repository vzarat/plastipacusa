"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  FlaskConical,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  submitSampleRequest,
  type SampleFilmType,
} from "@/actions/sample-requests";

const WIDTH_OPTIONS = ["", "15", "18", "20", "30"] as const;
const GAUGE_OPTIONS = ["", "60", "70", "80"] as const;

export function FreeSampleRequestForm() {
  const searchParams = useSearchParams();
  const productSlug = searchParams.get("product") || undefined;
  const productName = searchParams.get("name") || undefined;

  const initialFilmType = useMemo<SampleFilmType>(() => {
    const fromQuery = searchParams.get("film");
    if (fromQuery === "machine" || fromQuery === "hand") return fromQuery;
    if (productName?.toLowerCase().includes("genesis")) return "machine";
    return "hand";
  }, [searchParams, productName]);

  const [form, setForm] = useState({
    fullName: "",
    companyName: "",
    workEmail: "",
    phone: "",
    shippingZip: "",
    shippingAddress: "",
    filmType: initialFilmType,
    preferredWidth: "",
    preferredGauge: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitSampleRequest({
        fullName: form.fullName,
        companyName: form.companyName,
        workEmail: form.workEmail,
        phone: form.phone,
        shippingZip: form.shippingZip,
        shippingAddress: form.shippingAddress,
        filmType: form.filmType,
        preferredWidth: form.preferredWidth || undefined,
        preferredGauge: form.preferredGauge || undefined,
        productSlug,
        productName: productName || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to submit sample request.");
        return;
      }

      setSubmitted(true);
      toast.success(result.message || "Sample request received.");
    } catch {
      toast.error("Unable to submit sample request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-8 sm:p-10 text-center space-y-4 shadow-sm">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Sample Request Received
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
          Thank you. A Plastipac USA specialist will evaluate your corporate account
          eligibility and follow up with shipping details for your free sample roll.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="gradient" className="rounded-xl font-bold">
            <Link href="/products">Browse Catalog</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-5"
    >
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700">
          <FlaskConical className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
            Sample Request Form
          </h2>
          {productName ? (
            <p className="text-xs text-slate-500">
              Product interest:{" "}
              <span className="font-semibold text-slate-700">{productName}</span>
            </p>
          ) : null}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Full Name / Contact Person
        </span>
        <Input
          required
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          placeholder="Jane Smith"
          className="rounded-xl"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Company Name
          </span>
          <Input
            required
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Acme Logistics Inc."
            className="rounded-xl"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Corporate Email
          </span>
          <Input
            required
            type="email"
            value={form.workEmail}
            onChange={(e) => update("workEmail", e.target.value)}
            placeholder="jane@company.com"
            className="rounded-xl"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Phone Number
        </span>
        <Input
          required
          type="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="(956) 555-0100"
          className="rounded-xl"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Shipping Address
        </span>
        <Input
          value={form.shippingAddress}
          onChange={(e) => update("shippingAddress", e.target.value)}
          placeholder="Facility street address, city, state"
          className="rounded-xl"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Shipping ZIP Code
        </span>
        <Input
          required
          value={form.shippingZip}
          onChange={(e) => update("shippingZip", e.target.value)}
          placeholder="78501"
          className="rounded-xl"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Current Film Application Type
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(
            [
              { value: "hand" as const, label: "Hand Stretch Film" },
              { value: "machine" as const, label: "Machine High-Yield Film" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => update("filmType", option.value)}
              className={`rounded-xl border px-3 py-3 text-xs font-bold text-left transition-colors cursor-pointer ${
                form.filmType === option.value
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Preferred Width (Optional)
          </span>
          <select
            value={form.preferredWidth}
            onChange={(e) => update("preferredWidth", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">Select width</option>
            {WIDTH_OPTIONS.filter(Boolean).map((w) => (
              <option key={w} value={w}>
                {w}&quot;
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Preferred Gauge (Optional)
          </span>
          <select
            value={form.preferredGauge}
            onChange={(e) => update("preferredGauge", e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            <option value="">Select gauge</option>
            {GAUGE_OPTIONS.filter(Boolean).map((g) => (
              <option key={g} value={g}>
                {g} GA
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-[11px] leading-relaxed text-slate-400">
        *Restrictions apply. Free sample rolls are available strictly for verified
        corporate accounts and high-volume packaging operations in the contiguous US.
        Subject to evaluation and availability.
      </p>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-6"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Submitting Request…
          </>
        ) : (
          "Submit Free Sample Request"
        )}
      </Button>

      <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
        <PhoneCall className="h-3.5 w-3.5 text-sky-600" />
        Prefer to talk? Call{" "}
        <a href="tel:+19564003683" className="font-bold text-sky-700 hover:underline">
          (956) 400 36 83
        </a>
      </p>
    </form>
  );
}
