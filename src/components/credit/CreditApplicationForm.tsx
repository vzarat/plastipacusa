"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { submitCreditApplication } from "@/actions/credit-applications";

const fieldLabel =
  "text-[11px] font-bold uppercase tracking-wider text-slate-500";

export function CreditApplicationForm() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    workEmail: "",
    phone: "",
    taxIdEin: "",
    billingAddress: "",
    shippingAddress: "",
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
      const result = await submitCreditApplication({
        companyName: form.companyName,
        contactName: form.contactName,
        workEmail: form.workEmail,
        phone: form.phone,
        taxIdEin: form.taxIdEin,
        billingAddress: form.billingAddress || undefined,
        shippingAddress: form.shippingAddress || undefined,
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

        <label className="block space-y-1.5 sm:col-span-2">
          <span className={fieldLabel}>{t("credit.billingAddress")}</span>
          <Input
            value={form.billingAddress}
            onChange={(e) => update("billingAddress", e.target.value)}
            placeholder="Street, City, State, ZIP"
            className="rounded-xl"
          />
        </label>

        <label className="block space-y-1.5 sm:col-span-2">
          <span className={fieldLabel}>{t("credit.shippingAddress")}</span>
          <Input
            value={form.shippingAddress}
            onChange={(e) => update("shippingAddress", e.target.value)}
            placeholder="Street, City, State, ZIP"
            className="rounded-xl"
          />
        </label>

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
