"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Mail,
  MessageCircle,
  PenLine,
  PhoneCall,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  isBrowserTurnstileEnabled,
  TurnstileField,
} from "@/components/security/TurnstileField";
import { submitCommercialCreditApplication } from "@/actions/credit-applications";
import { US_STATES } from "@/lib/us-states";
import { SUPPORT_EMAIL } from "@/lib/company-email";
import {
  PRIMARY_PHONE_DISPLAY,
  PRIMARY_PHONE_HREF,
  WHATSAPP_PHONE_DISPLAY,
  WHATSAPP_URL_BARE,
} from "@/lib/company-contact";

const fieldLabel =
  "text-[11px] font-bold uppercase tracking-wider text-slate-500";

const inputClass =
  "min-h-11 rounded-xl text-base sm:text-sm";

const selectClass =
  "flex min-h-11 w-full touch-manipulation rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:border-sky-400 sm:text-sm";

const sectionShell =
  "min-w-0 space-y-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 sm:space-y-4 sm:p-5";

const AUTHORIZATION_TEXT =
  "The applicant requests establishment of a commercial credit account and certifies that all information supplied is true and complete. The applicant authorizes Plastipac USA LLC and its agents to verify the information provided, including contacting trade and bank references, and agrees to the seller’s standard commercial terms. The undersigned is authorized to execute this application on behalf of the applicant.";

type RefState = {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  creditTerms: string;
};

const emptyRef = (): RefState => ({
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  creditTerms: "",
});

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <h3 className="text-[13px] font-black uppercase leading-snug tracking-wide text-slate-900 sm:text-sm">
          {title}
        </h3>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 sm:text-xs">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AddressFields({
  street,
  city,
  state,
  zip,
  onStreet,
  onCity,
  onState,
  onZip,
  required,
}: {
  street: string;
  city: string;
  state: string;
  zip: string;
  onStreet: (v: string) => void;
  onCity: (v: string) => void;
  onState: (v: string) => void;
  onZip: (v: string) => void;
  required?: boolean;
}) {
  return (
    <>
      <Input
        required={required}
        value={street}
        onChange={(e) => onStreet(e.target.value)}
        placeholder="Street"
        className={inputClass}
        autoComplete="street-address"
      />
      <Input
        required={required}
        value={city}
        onChange={(e) => onCity(e.target.value)}
        placeholder="City"
        className={inputClass}
        autoComplete="address-level2"
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          required={required}
          value={state}
          onChange={(e) => onState(e.target.value)}
          className={selectClass}
          autoComplete="address-level1"
        >
          <option value="">State…</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.code}
            </option>
          ))}
        </select>
        <Input
          required={required}
          value={zip}
          onChange={(e) => onZip(e.target.value)}
          placeholder="ZIP"
          className={inputClass}
          inputMode="numeric"
          autoComplete="postal-code"
        />
      </div>
    </>
  );
}

function ContactHelpLinks() {
  return (
    <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-3">
      <a
        href={PRIMARY_PHONE_HREF}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-3 text-sm font-bold text-sky-800"
      >
        <PhoneCall className="h-4 w-4 shrink-0" />
        <span className="truncate">Call {PRIMARY_PHONE_DISPLAY}</span>
      </a>
      <a
        href={WHATSAPP_URL_BARE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-3 text-sm font-bold text-emerald-800"
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        <span className="truncate">WhatsApp {WHATSAPP_PHONE_DISPLAY}</span>
      </a>
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-800"
      >
        <Mail className="h-4 w-4 shrink-0" />
        <span className="truncate">{SUPPORT_EMAIL}</span>
      </a>
    </div>
  );
}

export function CreditApplicationForm() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const turnstileRequired = isBrowserTurnstileEnabled();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    creditLimitRequested: "",
    paymentTermsRequested: "Net 30",
    legalBusinessName: "",
    dbaName: "",
    taxIdEin: "",
    yearsInBusiness: "",
    businessStreet: "",
    businessCity: "",
    businessState: "",
    businessZip: "",
    billingSameAsBusiness: true,
    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    phone: "",
    email: "",
    website: "",
    businessType: "Corporation",
    apContactName: "",
    apPhone: "",
    apEmail: "",
    purchasingContactName: "",
    purchasingPhone: "",
    purchasingEmail: "",
    bankName: "",
    bankContactPerson: "",
    bankPhone: "",
    authorizedRepresentativeName: "",
    title: "",
    eSignature: "",
  });
  const [refs, setRefs] = useState<[RefState, RefState, RefState]>([
    emptyRef(),
    emptyRef(),
    emptyRef(),
  ]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateRef = (index: 0 | 1 | 2, key: keyof RefState, value: string) => {
    setRefs((prev) => {
      const next = [...prev] as [RefState, RefState, RefState];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (turnstileRequired && !turnstileToken) {
      toast.error("Please complete the bot check.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitCommercialCreditApplication({
        ...form,
        references: refs,
        turnstileToken: turnstileToken || undefined,
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
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-center shadow-sm sm:space-y-5 sm:rounded-3xl sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-2xl">
            Form sent successfully
          </h2>
          <p className="mx-auto max-w-lg text-[13px] leading-relaxed text-slate-600 sm:text-sm">
            Your commercial credit application was submitted. Our team will review it and follow up with eligibility details.
          </p>
          <p className="mx-auto max-w-lg text-[13px] leading-relaxed text-slate-600 sm:text-sm">
            If you have any questions, contact us by phone, WhatsApp, or email to support.
          </p>
        </div>
        <ContactHelpLinks />
        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button asChild variant="gradient" className="min-h-12 w-full touch-manipulation rounded-xl font-bold sm:w-auto">
            <Link href="/products">Browse Catalog</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12 w-full touch-manipulation rounded-xl font-bold sm:w-auto">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-3.5 sm:space-y-5">
      {/* Header / Request Setup */}
      <section className={sectionShell}>
        <SectionTitle
          icon={CreditCard}
          title="Credit Request Setup"
          subtitle="Application date is recorded automatically."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Application Date</span>
            <Input
              value={today}
              readOnly
              disabled
              className={`${inputClass} bg-slate-100`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Credit Limit Requested (USD) *</span>
            <Input
              required
              inputMode="decimal"
              value={form.creditLimitRequested}
              onChange={(e) => update("creditLimitRequested", e.target.value)}
              placeholder="25000"
              className={inputClass}
            />
          </label>
          <fieldset className="space-y-2 sm:col-span-1">
            <legend className={fieldLabel}>Payment Terms Requested *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["Net 15", "Net 30", "Net 45", "Other"] as const).map((term) => (
                <label
                  key={term}
                  className={`flex min-h-11 touch-manipulation cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-semibold ${
                    form.paymentTermsRequested === term
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-slate-50/60 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentTermsRequested"
                    className="sr-only"
                    checked={form.paymentTermsRequested === term}
                    onChange={() => update("paymentTermsRequested", term)}
                  />
                  {term}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {/* Section 1 */}
      <section className={sectionShell}>
        <SectionTitle icon={Building2} title="1. Business Information" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={fieldLabel}>Legal Business Name *</span>
            <Input
              required
              value={form.legalBusinessName}
              onChange={(e) => update("legalBusinessName", e.target.value)}
              className={inputClass}
              autoComplete="organization"
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>DBA Name</span>
            <Input
              value={form.dbaName}
              onChange={(e) => update("dbaName", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Tax ID / EIN *</span>
            <Input
              required
              value={form.taxIdEin}
              onChange={(e) => update("taxIdEin", e.target.value)}
              placeholder="XX-XXXXXXX"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Years in Business</span>
            <Input
              inputMode="numeric"
              value={form.yearsInBusiness}
              onChange={(e) => update("yearsInBusiness", e.target.value)}
              className={inputClass}
            />
          </label>
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className={fieldLabel}>Business Type *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["Corporation", "LLC", "Partnership", "Sole Proprietorship"] as const).map(
                (type) => (
                  <label
                    key={type}
                    className={`flex min-h-11 touch-manipulation cursor-pointer items-center gap-2 rounded-xl border px-2.5 text-[13px] text-slate-800 sm:px-3 sm:text-sm ${
                      form.businessType === type
                        ? "border-blue-600 bg-blue-50 font-semibold text-blue-900"
                        : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="businessType"
                      checked={form.businessType === type}
                      onChange={() => update("businessType", type)}
                      className="accent-blue-700"
                    />
                    <span className="leading-tight">{type}</span>
                  </label>
                )
              )}
            </div>
          </fieldset>

          <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:col-span-2">
            <p className={fieldLabel}>Business Address *</p>
            <AddressFields
              required
              street={form.businessStreet}
              city={form.businessCity}
              state={form.businessState}
              zip={form.businessZip}
              onStreet={(v) => update("businessStreet", v)}
              onCity={(v) => update("businessCity", v)}
              onState={(v) => update("businessState", v)}
              onZip={(v) => update("businessZip", v)}
            />
          </div>

          <label className="flex min-h-11 touch-manipulation items-start gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.billingSameAsBusiness}
              onChange={(e) => update("billingSameAsBusiness", e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700"
            />
            <span className="text-[13px] leading-snug text-slate-700 sm:text-sm">
              Billing address is the same as business address
            </span>
          </label>

          {!form.billingSameAsBusiness ? (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:col-span-2">
              <p className={fieldLabel}>Billing Address *</p>
              <AddressFields
                required
                street={form.billingStreet}
                city={form.billingCity}
                state={form.billingState}
                zip={form.billingZip}
                onStreet={(v) => update("billingStreet", v)}
                onCity={(v) => update("billingCity", v)}
                onState={(v) => update("billingState", v)}
                onZip={(v) => update("billingZip", v)}
              />
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className={fieldLabel}>Phone Number *</span>
            <Input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass}
              autoComplete="tel"
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Email Address *</span>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass}
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={fieldLabel}>Website</span>
            <Input
              type="url"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://"
              className={inputClass}
              inputMode="url"
            />
          </label>
        </div>
      </section>

      {/* Section 2 */}
      <section className={sectionShell}>
        <SectionTitle icon={Users} title="2. Contact Information" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <p className={`${fieldLabel} sm:col-span-3`}>Accounts Payable Contact *</p>
          <Input
            required
            value={form.apContactName}
            onChange={(e) => update("apContactName", e.target.value)}
            placeholder="AP name"
            className={inputClass}
          />
          <Input
            required
            type="tel"
            value={form.apPhone}
            onChange={(e) => update("apPhone", e.target.value)}
            placeholder="AP phone"
            className={inputClass}
          />
          <Input
            required
            type="email"
            value={form.apEmail}
            onChange={(e) => update("apEmail", e.target.value)}
            placeholder="AP email"
            className={inputClass}
          />

          <p className={`${fieldLabel} pt-1 sm:col-span-3 sm:pt-2`}>Purchasing Contact</p>
          <Input
            value={form.purchasingContactName}
            onChange={(e) => update("purchasingContactName", e.target.value)}
            placeholder="Purchasing name"
            className={inputClass}
          />
          <Input
            type="tel"
            value={form.purchasingPhone}
            onChange={(e) => update("purchasingPhone", e.target.value)}
            placeholder="Purchasing phone"
            className={inputClass}
          />
          <Input
            type="email"
            value={form.purchasingEmail}
            onChange={(e) => update("purchasingEmail", e.target.value)}
            placeholder="Purchasing email"
            className={inputClass}
          />
        </div>
      </section>

      {/* Section 3 */}
      <section className={sectionShell}>
        <SectionTitle
          icon={Building2}
          title="3. Commercial / Trade References"
          subtitle="Three references are required."
        />
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Commercial Reference #{index + 1} *
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                required
                value={refs[index as 0 | 1 | 2].companyName}
                onChange={(e) =>
                  updateRef(index as 0 | 1 | 2, "companyName", e.target.value)
                }
                placeholder="Company name"
                className={inputClass}
              />
              <Input
                required
                value={refs[index as 0 | 1 | 2].contactPerson}
                onChange={(e) =>
                  updateRef(index as 0 | 1 | 2, "contactPerson", e.target.value)
                }
                placeholder="Contact person"
                className={inputClass}
              />
              <Input
                required
                type="tel"
                value={refs[index as 0 | 1 | 2].phone}
                onChange={(e) => updateRef(index as 0 | 1 | 2, "phone", e.target.value)}
                placeholder="Phone"
                className={inputClass}
              />
              <Input
                type="email"
                value={refs[index as 0 | 1 | 2].email}
                onChange={(e) => updateRef(index as 0 | 1 | 2, "email", e.target.value)}
                placeholder="Email"
                className={inputClass}
              />
              <Input
                value={refs[index as 0 | 1 | 2].creditTerms}
                onChange={(e) =>
                  updateRef(index as 0 | 1 | 2, "creditTerms", e.target.value)
                }
                placeholder="Credit terms (e.g. Net 30)"
                className={`${inputClass} sm:col-span-2`}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Section 4 */}
      <section className={sectionShell}>
        <SectionTitle icon={Landmark} title="4. Bank Information" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            value={form.bankName}
            onChange={(e) => update("bankName", e.target.value)}
            placeholder="Bank name"
            className={inputClass}
          />
          <Input
            value={form.bankContactPerson}
            onChange={(e) => update("bankContactPerson", e.target.value)}
            placeholder="Bank contact person"
            className={inputClass}
          />
          <Input
            type="tel"
            value={form.bankPhone}
            onChange={(e) => update("bankPhone", e.target.value)}
            placeholder="Bank phone"
            className={inputClass}
          />
        </div>
      </section>

      {/* Section 5 */}
      <section className={sectionShell}>
        <SectionTitle icon={PenLine} title="5. Credit Authorization & E-Signature" />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[12px] leading-relaxed text-slate-700 sm:p-3.5 sm:text-sm">
          {AUTHORIZATION_TEXT}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Authorized Representative Name *</span>
            <Input
              required
              value={form.authorizedRepresentativeName}
              onChange={(e) =>
                update("authorizedRepresentativeName", e.target.value)
              }
              className={inputClass}
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Title *</span>
            <Input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Owner / CFO / Controller"
              className={inputClass}
              autoComplete="organization-title"
            />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={fieldLabel}>E-Signature (type full legal name) *</span>
            <Input
              required
              value={form.eSignature}
              onChange={(e) => update("eSignature", e.target.value)}
              placeholder="Type your full legal name as signature"
              className={`${inputClass} font-serif italic`}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Signature Date</span>
            <Input
              value={today}
              readOnly
              disabled
              className={`${inputClass} bg-slate-100`}
            />
          </label>
        </div>
      </section>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
        <div className="overflow-x-auto">
          <TurnstileField onToken={setTurnstileToken} />
        </div>
        <p className="hidden text-center text-[11px] text-slate-500 sm:block">
          Questions? Call {PRIMARY_PHONE_DISPLAY}, WhatsApp, or email {SUPPORT_EMAIL}.
        </p>
      </div>

      {/* Sticky mobile submit — keeps CTA reachable on long forms */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-white/95 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:pb-0 sm:shadow-none sm:backdrop-blur-none">
        <Button
          type="submit"
          variant="gradient"
          disabled={
            submitting || (turnstileRequired && !turnstileToken)
          }
          className="min-h-12 w-full touch-manipulation rounded-xl font-bold"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Credit Application"
          )}
        </Button>
        <p className="mt-2 text-center text-[10px] leading-snug text-slate-500 sm:hidden">
          Call {PRIMARY_PHONE_DISPLAY} · WhatsApp · {SUPPORT_EMAIL}
        </p>
      </div>
    </form>
  );
}
