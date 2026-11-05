"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
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
import { SUPPORT_EMAIL } from "@/lib/company-email";
import {
  PRIMARY_PHONE_DISPLAY,
  PRIMARY_PHONE_HREF,
  WHATSAPP_PHONE_DISPLAY,
  WHATSAPP_URL_BARE,
} from "@/lib/company-contact";

const fieldLabel =
  "text-[11px] font-bold uppercase tracking-wider text-slate-500";

const selectClassName =
  "flex min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:border-sky-400 disabled:cursor-not-allowed disabled:opacity-60";

function ContactHelpLinks({ stacked = false }: { stacked?: boolean }) {
  return (
    <div
      className={
        stacked
          ? "grid w-full grid-cols-1 gap-2.5"
          : "grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3"
      }
    >
      <a
        href={PRIMARY_PHONE_HREF}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-3 text-sm font-bold text-sky-800 transition active:scale-[0.98] hover:bg-sky-50"
      >
        <PhoneCall className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">Call {PRIMARY_PHONE_DISPLAY}</span>
      </a>
      <a
        href={WHATSAPP_URL_BARE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-bold text-emerald-800 transition active:scale-[0.98] hover:bg-emerald-50"
      >
        <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">WhatsApp {WHATSAPP_PHONE_DISPLAY}</span>
      </a>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800 transition active:scale-[0.98] hover:bg-slate-50"
      >
        <Mail className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{SUPPORT_EMAIL}</span>
      </a>
    </div>
  );
}

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

      const monthlyPallets = form.annualVolume.trim();
      const result = await submitCreditApplication({
        companyName: form.companyName,
        contactName: form.contactName,
        workEmail: form.workEmail,
        phone: form.phone,
        taxIdEin: form.taxIdEin,
        billingAddress: billingAddress || undefined,
        shippingAddress: shippingAddress || undefined,
        country,
        annualVolume: monthlyPallets
          ? `Monthly pallet volume: ${monthlyPallets}`
          : undefined,
        creditReference1: form.creditReference1
          ? `Monthly corporate reference: ${form.creditReference1}`
          : undefined,
        creditReference2: form.creditReference2 || undefined,
        notes: form.notes || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to submit credit application.");
        return;
      }

      setSubmitted(true);
      toast.success(result.message || "Form sent successfully.");
    } catch {
      toast.error("Unable to submit credit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center shadow-sm sm:rounded-3xl sm:p-8 md:p-10">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-700 sm:h-14 sm:w-14">
          <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <div className="space-y-2 px-1">
          <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            {t("credit.successTitle")}
          </h2>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-600">
            {t("credit.successBody")}
          </p>
          <p className="mx-auto max-w-lg text-sm leading-relaxed text-slate-600">
            {t("credit.successHelp")}
          </p>
        </div>

        <ContactHelpLinks stacked />

        <div className="flex w-full flex-col gap-2.5 pt-1 sm:flex-row sm:justify-center">
          <Button asChild variant="gradient" className="min-h-12 w-full rounded-xl font-bold sm:w-auto">
            <Link href="/products">{t("credit.browseCatalog")}</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12 w-full rounded-xl font-bold sm:w-auto">
            <Link href="/">{t("credit.backHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6 md:p-8"
    >
      <div className="flex items-start gap-2.5 sm:items-center">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-700">
          <CreditCard className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
            {t("credit.formTitle")}
          </h2>
          <p className="text-xs leading-relaxed text-slate-500">
            {t("credit.formSubtitle")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className={fieldLabel}>{t("credit.companyName")}</span>
          <Input
            required
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Acme Logistics LLC"
            className="min-h-11 rounded-xl"
          />
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.contactName")}</span>
          <Input
            required
            value={form.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            placeholder="Jane Smith"
            className="min-h-11 rounded-xl"
          />
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.taxId")}</span>
          <Input
            required
            value={form.taxIdEin}
            onChange={(e) => update("taxIdEin", e.target.value)}
            placeholder="XX-XXXXXXX"
            className="min-h-11 rounded-xl"
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
            className="min-h-11 rounded-xl"
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
            className="min-h-11 rounded-xl"
          />
        </label>

        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 sm:col-span-2 sm:p-4">
          <p className={fieldLabel}>{t("credit.billingAddress")}</p>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>{t("credit.street")}</span>
            <Input
              value={form.billingStreet}
              onChange={(e) => update("billingStreet", e.target.value)}
              placeholder="1000 Industrial Parkway"
              className="min-h-11 rounded-xl"
              autoComplete="billing street-address"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className={fieldLabel}>{t("credit.city")}</span>
              <Input
                value={form.billingCity}
                onChange={(e) => update("billingCity", e.target.value)}
                placeholder="Dallas"
                className="min-h-11 rounded-xl"
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
                className="min-h-11 rounded-xl"
                autoComplete="billing postal-code"
              />
            </label>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 sm:col-span-2 sm:p-4">
          <p className={fieldLabel}>{t("credit.shippingAddress")}</p>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>{t("credit.street")}</span>
            <Input
              value={form.shippingStreet}
              onChange={(e) => update("shippingStreet", e.target.value)}
              placeholder="1000 Industrial Parkway"
              className="min-h-11 rounded-xl"
              autoComplete="shipping street-address"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className={fieldLabel}>{t("credit.city")}</span>
              <Input
                value={form.shippingCity}
                onChange={(e) => update("shippingCity", e.target.value)}
                placeholder="Dallas"
                className="min-h-11 rounded-xl"
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
                className="min-h-11 rounded-xl"
                autoComplete="shipping postal-code"
              />
            </label>
          </div>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <span className={fieldLabel}>{t("credit.country")}</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              name="country"
              value={form.country}
              readOnly
              disabled
              className="min-h-11 cursor-not-allowed rounded-xl border-slate-200 bg-slate-100 pl-9 text-slate-700"
              aria-readonly="true"
            />
            <input type="hidden" name="country" value={CREDIT_APPLICATION_COUNTRY} />
          </div>
          <p className="flex items-start gap-1.5 pt-0.5 text-[11px] leading-relaxed text-slate-500">
            <Lock className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
            {t("credit.countryNote")}
          </p>
        </div>

        <label className="block space-y-1.5 sm:col-span-2">
          <span className={fieldLabel}>{t("credit.annualVolume")}</span>
          <Input
            required
            value={form.annualVolume}
            onChange={(e) => update("annualVolume", e.target.value)}
            placeholder="e.g. 8–20 pallets / month"
            className="min-h-11 rounded-xl"
          />
          <span className="block text-[11px] text-slate-500">
            {t("credit.annualVolumeHint")}
          </span>
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
            className="min-h-11 rounded-xl"
          />
          <span className="block text-[11px] text-slate-500">
            {t("credit.reference1Hint")}
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className={fieldLabel}>{t("credit.reference2")}</span>
          <Input
            value={form.creditReference2}
            onChange={(e) => update("creditReference2", e.target.value)}
            placeholder="Vendor name · AP contact · phone"
            className="min-h-11 rounded-xl"
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
          className="flex min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:border-sky-400"
        />
      </label>

      <div className="flex flex-col gap-3 pt-1">
        <p className="text-[11px] leading-relaxed text-slate-500">
          {t("credit.authNote")}
        </p>
        <Button
          type="submit"
          variant="gradient"
          disabled={submitting}
          className="min-h-12 w-full rounded-xl font-bold sm:w-auto sm:min-w-[220px] sm:self-end"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("credit.submitting")}
            </>
          ) : (
            t("credit.submit")
          )}
        </Button>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-4">
        <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:text-left">
          {t("credit.questions")}
        </p>
        <ContactHelpLinks />
      </div>
    </form>
  );
}
