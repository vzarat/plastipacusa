"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { submitCreditApplication } from "@/actions/credit-applications";
import {
  CREDIT_APPLICATION_COUNTRY,
  US_STATES,
  formatUsAddress,
} from "@/lib/us-states";

const fieldLabel =
  "text-[11px] font-bold uppercase tracking-wider text-slate-500";

const selectClassName =
  "flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60";

export function CreditApplicationForm() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    workEmail: "",
    phone: "",
    taxIdEin: "",
    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    shippingStreet: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
    country: CREDIT_APPLICATION_COUNTRY,
    annualVolume: "",
    creditReference1: "",
    creditReference2: "",
    creditReference3: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const country = CREDIT_APPLICATION_COUNTRY;
      const billingAddress = formatUsAddress({
        street: form.billingStreet,
        city: form.billingCity,
        state: form.billingState,
        zip: form.billingZip,
        country,
      });
      const shippingAddress = formatUsAddress({
        street: form.shippingStreet,
        city: form.shippingCity,
        state: form.shippingState,
        zip: form.shippingZip,
        country,
      });

      const result = await submitCreditApplication({
        companyName: form.companyName,
        contactName: form.contactName,
        workEmail: form.workEmail,
        phone: form.phone,
        taxIdEin: form.taxIdEin,
        billingAddress: billingAddress || undefined,
        shippingAddress: shippingAddress || undefined,
        country,
        annualVolume: form.annualVolume || undefined,
        creditReference1: form.creditReference1 || undefined,
        creditReference2: form.creditReference2 || undefined,
        creditReference3: form.creditReference3 || undefined,
        notes: form.notes || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to submit credit application.");
        return;
      }

      setSubmitted(true);
      toast.success(result.message || "Credit application received.");
    } catch {
      toast.error("Unable to submit credit application. Please try again.");
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
          {t("credit.successTitle")}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
          {t("credit.successBody")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="gradient" className="rounded-xl font-bold">
            <Link href="/products">{t("credit.browseCatalog")}</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl font-bold">
            <Link href="/">{t("credit.backHome")}</Link>
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
          <CreditCard className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
            {t("credit.formTitle")}
          </h2>
          <p className="text-xs text-slate-500">{t("credit.formSubtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className={fieldLabel}>{t("credit.companyName")}</span>
          <Input
            required
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Acme Logistics LLC"
            className="rounded-xl"
          />
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.contactName")}</span>
          <Input
            required
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            placeholder="Jane Smith"
            className="rounded-xl"
          />
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.taxId")}</span>
          <Input
            required
            value={form.taxIdEin}
            onChange={(e) => update("taxIdEin", e.target.value)}
            placeholder="XX-XXXXXXX"
            className="rounded-xl"
            autoComplete="off"
          />
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.email")}</span>
          <Input
            required
            type="email"
            value={form.workEmail}
            onChange={(e) => update("workEmail", e.target.value)}
            placeholder="ap@company.com"
            className="rounded-xl"
          />
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.phone")}</span>
          <Input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(555) 000-0000"
            className="rounded-xl"
          />
        </label>

        {/* Billing address */}
        <div className="sm:col-span-2 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
          <p className={fieldLabel}>{t("credit.billingAddress")}</p>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>{t("credit.street")}</span>
            <Input
              value={form.billingStreet}
              onChange={(e) => update("billingStreet", e.target.value)}
              placeholder="1000 Industrial Parkway"
              className="rounded-xl"
              autoComplete="billing street-address"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1.5 sm:col-span-1">
              <span className={fieldLabel}>{t("credit.city")}</span>
              <Input
                value={form.billingCity}
                onChange={(e) => update("billingCity", e.target.value)}
                placeholder="Dallas"
                className="rounded-xl"
                autoComplete="billing address-level2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={fieldLabel}>{t("credit.state")}</span>
              <select
                required={Boolean(
                  form.billingStreet || form.billingCity || form.billingZip
                )}
                value={form.billingState}
                onChange={(e) => update("billingState", e.target.value)}
                className={selectClassName}
                autoComplete="billing address-level1"
              >
                <option value="">{t("credit.selectState")}</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={fieldLabel}>{t("credit.zip")}</span>
              <Input
                value={form.billingZip}
                onChange={(e) => update("billingZip", e.target.value)}
                placeholder="75201"
                className="rounded-xl"
                autoComplete="billing postal-code"
              />
            </label>
          </div>
        </div>

        {/* Shipping address */}
        <div className="sm:col-span-2 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
          <p className={fieldLabel}>{t("credit.shippingAddress")}</p>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>{t("credit.street")}</span>
            <Input
              value={form.shippingStreet}
              onChange={(e) => update("shippingStreet", e.target.value)}
              placeholder="1000 Industrial Parkway"
              className="rounded-xl"
              autoComplete="shipping street-address"
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block space-y-1.5 sm:col-span-1">
              <span className={fieldLabel}>{t("credit.city")}</span>
              <Input
                value={form.shippingCity}
                onChange={(e) => update("shippingCity", e.target.value)}
                placeholder="Dallas"
                className="rounded-xl"
                autoComplete="shipping address-level2"
              />
            </label>
            <label className="block space-y-1.5">
              <span className={fieldLabel}>{t("credit.state")}</span>
              <select
                required={Boolean(
                  form.shippingStreet || form.shippingCity || form.shippingZip
                )}
                value={form.shippingState}
                onChange={(e) => update("shippingState", e.target.value)}
                className={selectClassName}
                autoComplete="shipping address-level1"
              >
                <option value="">{t("credit.selectState")}</option>
                {US_STATES.map((state) => (
                  <option key={`ship-${state.code}`} value={state.code}>
                    {state.name} ({state.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className={fieldLabel}>{t("credit.zip")}</span>
              <Input
                value={form.shippingZip}
                onChange={(e) => update("shippingZip", e.target.value)}
                placeholder="75201"
                className="rounded-xl"
                autoComplete="shipping postal-code"
              />
            </label>
          </div>
        </div>

        {/* Locked country — USA only */}
        <div className="sm:col-span-2 space-y-1.5">
          <span className={fieldLabel}>{t("credit.country")}</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              name="country"
              value={form.country}
              readOnly
              disabled
              className="rounded-xl pl-9 bg-slate-100 text-slate-700 cursor-not-allowed border-slate-200"
              aria-readonly="true"
            />
            <input type="hidden" name="country" value={CREDIT_APPLICATION_COUNTRY} />
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed flex items-start gap-1.5 pt-0.5">
            <Lock className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
            {t("credit.countryNote")}
          </p>
        </div>

        <label className="block space-y-1.5 sm:col-span-2">
          <span className={fieldLabel}>{t("credit.annualVolume")}</span>
          <Input
            value={form.annualVolume}
            onChange={(e) => update("annualVolume", e.target.value)}
            placeholder="e.g. 40–80 pallets / year"
            className="rounded-xl"
          />
        </label>
      </div>

      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-sky-600" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {t("credit.referencesHeading")}
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.reference1")}</span>
          <Input
            required
            value={form.creditReference1}
            onChange={(e) => update("creditReference1", e.target.value)}
            placeholder="Vendor name · AP contact · phone"
            className="rounded-xl"
          />
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.reference2")}</span>
          <Input
            value={form.creditReference2}
            onChange={(e) => update("creditReference2", e.target.value)}
            placeholder="Vendor name · AP contact · phone"
            className="rounded-xl"
          />
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.reference3")}</span>
          <Input
            value={form.creditReference3}
            onChange={(e) => update("creditReference3", e.target.value)}
            placeholder="Vendor name · AP contact · phone"
            className="rounded-xl"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={fieldLabel}>{t("credit.notes")}</span>
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          placeholder="PO process details, preferred payment method, or credit line request…"
          className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:border-sky-400"
        />
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <p className="text-[11px] text-slate-500 leading-relaxed max-w-md">
          {t("credit.authNote")}
        </p>
        <Button
          type="submit"
          variant="gradient"
          disabled={submitting}
          className="rounded-xl font-bold min-w-[220px]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("credit.submitting")}
            </>
          ) : (
            t("credit.submit")
          )}
        </Button>
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <PhoneCall className="w-3.5 h-3.5" />
        {t("credit.questions")}{" "}
        <a
          href="tel:+19564003683"
          className="font-semibold text-sky-700 hover:underline"
        >
          (956) 400-3683
        </a>
      </p>
    </form>
  );
}
