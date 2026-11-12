"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import type { UserProfile } from "@/actions/auth";
import { submitCommercialCreditApplication } from "@/actions/credit-applications";
import { CreditAuthRequiredModal } from "@/components/credit/CreditAuthRequiredModal";
import { useRouter } from "next/navigation";
import {
  CREDIT_APPLICATION_FIELD_LABELS,
  emailMatchesWebsiteDomain,
  inferCreditApplicationErrorField,
  isValidCorporateEmail,
  isValidUsEin,
  validateCreditApplicationIdentityFields,
  type CreditApplicationErrorField,
} from "@/lib/credit-application-validation";
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

const inputErrorClass =
  "border-rose-500 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus-visible:border-rose-500 focus-visible:ring-rose-300";

const inputOkClass =
  "border-emerald-500 bg-emerald-50/40 text-slate-900 ring-2 ring-emerald-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-300";

const selectErrorClass =
  "border-rose-500 bg-rose-50/60 text-rose-950 ring-2 ring-rose-200 focus-visible:border-rose-500 focus-visible:ring-rose-300";

const sectionShell =
  "min-w-0 space-y-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 sm:space-y-4 sm:p-5";

/** Identity fields that get a loading → green check after blur. */
type VerifyField = "email" | "website" | "taxIdEin" | "apEmail";
type VerifyStatus = "idle" | "checking" | "ok" | "error";

const VERIFY_DELAY_MS = 500;

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

function fieldControlClass(
  base: string,
  errorField: CreditApplicationErrorField | null,
  field: CreditApplicationErrorField,
  kind: "input" | "select" = "input",
  verifyStatus: VerifyStatus = "idle"
) {
  const pad = verifyStatus === "checking" || verifyStatus === "ok" ? "pr-10" : "";
  if (errorField === field || verifyStatus === "error") {
    return `${base} ${pad} ${kind === "select" ? selectErrorClass : inputErrorClass}`;
  }
  if (verifyStatus === "ok") {
    return `${base} ${pad} ${inputOkClass}`;
  }
  if (verifyStatus === "checking") {
    return `${base} ${pad}`;
  }
  return base;
}

function FieldErrorText({
  errorField,
  field,
  message,
}: {
  errorField: CreditApplicationErrorField | null;
  field: CreditApplicationErrorField;
  message: string | null;
}) {
  if (errorField !== field || !message) return null;
  const label = CREDIT_APPLICATION_FIELD_LABELS[field];
  return (
    <p
      id={`credit-error-${field}`}
      role="alert"
      className="text-[12px] font-semibold leading-snug text-rose-700"
    >
      <span className="font-black">{label}:</span> {message}
    </p>
  );
}

function VerifiedInputShell({
  status,
  children,
}: {
  status: VerifyStatus;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
      {status === "checking" || status === "ok" ? (
        <span
          className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center"
          aria-hidden
        >
          {status === "checking" ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
          )}
        </span>
      ) : null}
      {status === "ok" ? (
        <span className="sr-only">Verified</span>
      ) : status === "checking" ? (
        <span className="sr-only">Checking</span>
      ) : null}
    </div>
  );
}

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
  errorField,
  errorMessage,
  streetField,
  cityField,
  stateField,
  zipField,
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
  errorField: CreditApplicationErrorField | null;
  errorMessage: string | null;
  streetField: CreditApplicationErrorField;
  cityField: CreditApplicationErrorField;
  stateField: CreditApplicationErrorField;
  zipField: CreditApplicationErrorField;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Input
          id={`credit-field-${streetField}`}
          required={required}
          value={street}
          onChange={(e) => onStreet(e.target.value)}
          placeholder="Street"
          className={fieldControlClass(inputClass, errorField, streetField)}
          aria-invalid={errorField === streetField}
          aria-describedby={errorField === streetField ? `credit-error-${streetField}` : undefined}
          autoComplete="street-address"
        />
        <FieldErrorText errorField={errorField} field={streetField} message={errorMessage} />
      </div>
      <div className="space-y-1.5">
        <Input
          id={`credit-field-${cityField}`}
          required={required}
          value={city}
          onChange={(e) => onCity(e.target.value)}
          placeholder="City"
          className={fieldControlClass(inputClass, errorField, cityField)}
          aria-invalid={errorField === cityField}
          aria-describedby={errorField === cityField ? `credit-error-${cityField}` : undefined}
          autoComplete="address-level2"
        />
        <FieldErrorText errorField={errorField} field={cityField} message={errorMessage} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <select
            id={`credit-field-${stateField}`}
            required={required}
            value={state}
            onChange={(e) => onState(e.target.value)}
            className={fieldControlClass(selectClass, errorField, stateField, "select")}
            aria-invalid={errorField === stateField}
            aria-describedby={errorField === stateField ? `credit-error-${stateField}` : undefined}
            autoComplete="address-level1"
          >
            <option value="">State…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code}
              </option>
            ))}
          </select>
          <FieldErrorText errorField={errorField} field={stateField} message={errorMessage} />
        </div>
        <div className="space-y-1.5">
          <Input
            id={`credit-field-${zipField}`}
            required={required}
            value={zip}
            onChange={(e) => onZip(e.target.value)}
            placeholder="ZIP"
            className={fieldControlClass(inputClass, errorField, zipField)}
            aria-invalid={errorField === zipField}
            aria-describedby={errorField === zipField ? `credit-error-${zipField}` : undefined}
            inputMode="numeric"
            autoComplete="postal-code"
          />
          <FieldErrorText errorField={errorField} field={zipField} message={errorMessage} />
        </div>
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

const CREDIT_DRAFT_KEY = "plastipac_credit_application_draft_v1";

function emptyProfile(): UserProfile {
  return {
    id: "",
    fullName: "",
    companyName: "",
    role: "client",
    email: "",
    phone: "",
    taxId: "",
  };
}

function prefillFromProfile(profile: UserProfile | null) {
  const p = profile || emptyProfile();
  const company = String(p.companyName || "").trim();
  const fullName = String(p.fullName || "").trim();
  const email = String(p.email || "").trim().toLowerCase();
  const phone = String(p.phone || "").trim();
  const taxId = String(p.taxId || "").trim();
  return {
    creditLimitRequested: "",
    paymentTermsRequested: "Net 30",
    legalBusinessName: company,
    dbaName: "",
    taxIdEin: taxId,
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
    phone,
    email,
    website: "",
    businessType: "Corporation",
    apContactName: fullName,
    apPhone: phone,
    apEmail: email,
    purchasingContactName: "",
    purchasingPhone: "",
    purchasingEmail: "",
    bankName: "",
    bankContactPerson: "",
    bankPhone: "",
    authorizedRepresentativeName: fullName,
    title: "",
    eSignature: fullName,
  };
}

function readDraft(): {
  form: ReturnType<typeof prefillFromProfile>;
  refs: [RefState, RefState, RefState];
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CREDIT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      form?: ReturnType<typeof prefillFromProfile>;
      refs?: [RefState, RefState, RefState];
    };
    if (!parsed?.form || !parsed?.refs) return null;
    return { form: parsed.form, refs: parsed.refs };
  } catch {
    return null;
  }
}

export function CreditApplicationForm({
  profile,
}: {
  profile: UserProfile | null;
}) {
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const turnstileRequired = isBrowserTurnstileEnabled();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<CreditApplicationErrorField | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<Partial<Record<VerifyField, VerifyStatus>>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(profile?.id));
  const [authOpen, setAuthOpen] = useState(false);
  const errorBannerRef = useRef<HTMLParagraphElement | null>(null);
  const verifyTimersRef = useRef<Partial<Record<VerifyField, number>>>({});
  const autoSubmitAfterAuthRef = useRef(false);
  const promptedAuthOnInteractRef = useRef(false);

  useEffect(() => {
    if (profile?.id) setIsAuthenticated(true);
  }, [profile?.id]);

  const [form, setForm] = useState(() => prefillFromProfile(profile));
  const [refs, setRefs] = useState<[RefState, RefState, RefState]>(() => [
    emptyRef(),
    emptyRef(),
    emptyRef(),
  ]);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setForm(draft.form);
      setRefs(draft.refs);
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      sessionStorage.setItem(
        CREDIT_DRAFT_KEY,
        JSON.stringify({ form, refs })
      );
    } catch {
      // ignore quota / private mode
    }
  }, [form, refs, draftReady]);

  const setFieldIssue = (field: CreditApplicationErrorField | null, message: string | null) => {
    setErrorField(field);
    setFieldError(message);
  };

  const clearFieldIssue = () => setFieldIssue(null, null);

  const setVerify = (field: VerifyField, status: VerifyStatus) => {
    setVerifyStatus((prev) => ({ ...prev, [field]: status }));
  };

  const resetVerify = (field: VerifyField) => {
    const timer = verifyTimersRef.current[field];
    if (timer) window.clearTimeout(timer);
    verifyTimersRef.current[field] = undefined;
    setVerify(field, "idle");
  };

  const runVerify = (
    field: VerifyField,
    validate: () => { ok: boolean; error?: string; onOk?: () => void }
  ) => {
    const timer = verifyTimersRef.current[field];
    if (timer) window.clearTimeout(timer);
    setVerify(field, "checking");
    if (errorField === field) clearFieldIssue();
    verifyTimersRef.current[field] = window.setTimeout(() => {
      const result = validate();
      if (result.ok) {
        result.onOk?.();
        setVerify(field, "ok");
        if (errorField === field) clearFieldIssue();
        return;
      }
      setVerify(field, "error");
      setFieldIssue(field, result.error || "Please fix this field.");
    }, VERIFY_DELAY_MS) as unknown as number;
  };

  useEffect(() => {
    return () => {
      for (const timer of Object.values(verifyTimersRef.current)) {
        if (timer) window.clearTimeout(timer);
      }
    };
  }, []);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errorField === (key as CreditApplicationErrorField)) clearFieldIssue();
    if (key === "email" || key === "website" || key === "taxIdEin" || key === "apEmail") {
      resetVerify(key);
    }
    if (key === "email") {
      resetVerify("website");
    }
  };

  const updateRef = (index: 0 | 1 | 2, key: keyof RefState, value: string) => {
    const fieldMap: Record<keyof RefState, CreditApplicationErrorField | null> = {
      companyName: `ref${index + 1}CompanyName` as CreditApplicationErrorField,
      contactPerson: `ref${index + 1}ContactPerson` as CreditApplicationErrorField,
      phone: `ref${index + 1}Phone` as CreditApplicationErrorField,
      email: null,
      creditTerms: null,
    };
    setRefs((prev) => {
      const next = [...prev] as [RefState, RefState, RefState];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
    const mapped = fieldMap[key];
    if (mapped && errorField === mapped) clearFieldIssue();
  };

  useEffect(() => {
    if (!errorField || !fieldError) return;
    const target =
      document.getElementById(`credit-field-${errorField}`) || errorBannerRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target instanceof HTMLElement && "focus" in target) {
      try {
        target.focus({ preventScroll: true });
      } catch {
        /* ignore non-focusable nodes */
      }
    }
  }, [errorField, fieldError]);

  const openAuthGate = (opts?: { autoSubmit?: boolean }) => {
    autoSubmitAfterAuthRef.current = opts?.autoSubmit !== false;
    setAuthOpen(true);
  };

  const handleGuestInteract = () => {
    if (isAuthenticated || authOpen || promptedAuthOnInteractRef.current) return;
    promptedAuthOnInteractRef.current = true;
    // Soft prompt on first field interaction — guest can dismiss and keep filling.
    openAuthGate({ autoSubmit: false });
  };

  const submitApplication = async () => {
    if (turnstileRequired && !turnstileToken) {
      const message = "Please complete the bot check.";
      setFieldIssue("turnstile", message);
      toast.error(message);
      return false;
    }

    const identity = validateCreditApplicationIdentityFields({
      email: form.email,
      apEmail: form.apEmail,
      taxIdEin: form.taxIdEin,
      website: form.website,
    });
    if (!identity.ok) {
      const message = identity.error || "Please fix the verification fields.";
      setFieldIssue(identity.field || inferCreditApplicationErrorField(message), message);
      toast.error(message);
      return false;
    }
    clearFieldIssue();

    const normalizedForm = {
      ...form,
      taxIdEin: identity.normalizedEin || form.taxIdEin,
    };
    if (normalizedForm.taxIdEin !== form.taxIdEin) {
      update("taxIdEin", normalizedForm.taxIdEin);
    }

    setSubmitting(true);
    try {
      const result = await submitCommercialCreditApplication({
        ...normalizedForm,
        references: refs,
        turnstileToken: turnstileToken || undefined,
      });
      if (!result.success) {
        const message = result.error || "Unable to submit credit application.";
        setFieldIssue(
          result.field || inferCreditApplicationErrorField(message),
          message
        );
        toast.error(message);
        return false;
      }
      clearFieldIssue();
      setSubmitted(true);
      try {
        sessionStorage.removeItem(CREDIT_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      toast.success(result.message || "Form sent successfully.");
      return true;
    } catch {
      toast.error("Unable to submit credit application. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAuthenticated) {
      openAuthGate({ autoSubmit: true });
      return;
    }
    await submitApplication();
  };

  const handleAuthenticated = async (info: {
    email: string;
    fullName?: string;
    companyName?: string;
  }) => {
    setIsAuthenticated(true);
    setAuthOpen(false);
    // Fill only blank identity fields from the new session — never wipe guest answers.
    setForm((prev) => ({
      ...prev,
      email: prev.email || info.email || "",
      apEmail: prev.apEmail || info.email || "",
      legalBusinessName: prev.legalBusinessName || info.companyName || "",
      apContactName: prev.apContactName || info.fullName || "",
      authorizedRepresentativeName:
        prev.authorizedRepresentativeName || info.fullName || "",
      eSignature: prev.eSignature || info.fullName || "",
    }));
    router.refresh();
    if (autoSubmitAfterAuthRef.current) {
      autoSubmitAfterAuthRef.current = false;
      // Let cookie session settle before the server action.
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      await submitApplication();
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
            Your commercial credit application was submitted. A confirmation was sent to your work email. Our team will review it and follow up with eligibility details.
          </p>
          <p className="mx-auto max-w-lg text-[13px] leading-relaxed text-slate-600 sm:text-sm">
            Track pending, approved, or rejected status anytime in your credit dashboard.
          </p>
        </div>
        <ContactHelpLinks />
        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button asChild variant="gradient" className="min-h-12 w-full touch-manipulation rounded-xl font-bold sm:w-auto">
            <Link href="/dashboard/credit">View Credit Status</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-12 w-full touch-manipulation rounded-xl font-bold sm:w-auto">
            <Link href="/products">Browse Catalog</Link>
          </Button>
        </div>
      </div>
    );
  }

  const summaryLabel = errorField ? CREDIT_APPLICATION_FIELD_LABELS[errorField] : null;

  return (
    <>
    <CreditAuthRequiredModal
      open={authOpen}
      dismissible
      onClose={() => {
        autoSubmitAfterAuthRef.current = false;
        setAuthOpen(false);
      }}
      defaultEmail={form.email || form.apEmail}
      defaultFullName={form.authorizedRepresentativeName || form.apContactName}
      defaultCompanyName={form.legalBusinessName}
      onAuthenticated={handleAuthenticated}
    />
    <form
      onSubmit={handleSubmit}
      onFocusCapture={handleGuestInteract}
      className="min-w-0 space-y-3.5 sm:space-y-5"
      noValidate
    >
      {!isAuthenticated ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-3.5 py-3 text-[12px] leading-relaxed text-amber-950 sm:text-xs">
          <p className="font-semibold">Guest preview</p>
          <p className="mt-1 text-amber-900/85">
            Fill out the application now. When you submit, a quick B2B sign-in / sign-up modal
            appears — your answers stay on this page and we submit automatically after you
            authenticate.
          </p>
        </div>
      ) : null}
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
              id="credit-field-creditLimitRequested"
              required
              inputMode="decimal"
              value={form.creditLimitRequested}
              onChange={(e) => update("creditLimitRequested", e.target.value)}
              placeholder="25000"
              className={fieldControlClass(inputClass, errorField, "creditLimitRequested")}
              aria-invalid={errorField === "creditLimitRequested"}
              aria-describedby={
                errorField === "creditLimitRequested"
                  ? "credit-error-creditLimitRequested"
                  : undefined
              }
            />
            <FieldErrorText
              errorField={errorField}
              field="creditLimitRequested"
              message={fieldError}
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
              id="credit-field-legalBusinessName"
              required
              value={form.legalBusinessName}
              onChange={(e) => update("legalBusinessName", e.target.value)}
              className={fieldControlClass(inputClass, errorField, "legalBusinessName")}
              aria-invalid={errorField === "legalBusinessName"}
              aria-describedby={
                errorField === "legalBusinessName" ? "credit-error-legalBusinessName" : undefined
              }
              autoComplete="organization"
            />
            <FieldErrorText
              errorField={errorField}
              field="legalBusinessName"
              message={fieldError}
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
            <VerifiedInputShell status={verifyStatus.taxIdEin || "idle"}>
              <Input
                id="credit-field-taxIdEin"
                required
                value={form.taxIdEin}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d-]/g, "").slice(0, 10);
                  update("taxIdEin", next);
                }}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) {
                    resetVerify("taxIdEin");
                    return;
                  }
                  runVerify("taxIdEin", () => {
                    const ein = isValidUsEin(raw);
                    if (ein.ok && ein.normalized) {
                      return {
                        ok: true,
                        onOk: () => {
                          setForm((prev) =>
                            prev.taxIdEin === ein.normalized
                              ? prev
                              : { ...prev, taxIdEin: ein.normalized || prev.taxIdEin }
                          );
                        },
                      };
                    }
                    return { ok: false, error: ein.error };
                  });
                }}
                placeholder="XX-XXXXXXX"
                inputMode="numeric"
                pattern="(\d{2}-\d{7}|\d{9})"
                title="US IRS EIN format: XX-XXXXXXX or 9 digits"
                className={fieldControlClass(
                  inputClass,
                  errorField,
                  "taxIdEin",
                  "input",
                  verifyStatus.taxIdEin || "idle"
                )}
                aria-invalid={errorField === "taxIdEin" || verifyStatus.taxIdEin === "error"}
                aria-describedby={errorField === "taxIdEin" ? "credit-error-taxIdEin" : undefined}
                autoComplete="off"
              />
            </VerifiedInputShell>
            <span className="block text-[11px] leading-snug text-slate-500">
              IRS format required: XX-XXXXXXX (or 9 digits).
            </span>
            <FieldErrorText errorField={errorField} field="taxIdEin" message={fieldError} />
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
          <fieldset
            id="credit-field-businessType"
            className={`space-y-2 sm:col-span-2 ${
              errorField === "businessType" ? "rounded-xl ring-2 ring-rose-300" : ""
            }`}
          >
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
            <FieldErrorText errorField={errorField} field="businessType" message={fieldError} />
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
              errorField={errorField}
              errorMessage={fieldError}
              streetField="businessStreet"
              cityField="businessCity"
              stateField="businessState"
              zipField="businessZip"
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
                errorField={errorField}
                errorMessage={fieldError}
                streetField="billingStreet"
                cityField="billingCity"
                stateField="billingState"
                zipField="billingZip"
              />
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className={fieldLabel}>Phone Number *</span>
            <Input
              id="credit-field-phone"
              required
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={fieldControlClass(inputClass, errorField, "phone")}
              aria-invalid={errorField === "phone"}
              aria-describedby={errorField === "phone" ? "credit-error-phone" : undefined}
              autoComplete="tel"
            />
            <FieldErrorText errorField={errorField} field="phone" message={fieldError} />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Email Address *</span>
            <VerifiedInputShell status={verifyStatus.email || "idle"}>
              <Input
                id="credit-field-email"
                required
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (!value) {
                    resetVerify("email");
                    return;
                  }
                  runVerify("email", () => {
                    const check = isValidCorporateEmail(value);
                    if (!check.ok) return { ok: false, error: check.error };
                    return {
                      ok: true,
                      onOk: () => {
                        const website = form.website.trim();
                        if (!website) return;
                        runVerify("website", () => {
                          const match = emailMatchesWebsiteDomain(value, website);
                          return match.ok
                            ? { ok: true }
                            : { ok: false, error: match.error };
                        });
                      },
                    };
                  });
                }}
                placeholder="name@company.com"
                className={fieldControlClass(
                  inputClass,
                  errorField,
                  "email",
                  "input",
                  verifyStatus.email || "idle"
                )}
                aria-invalid={errorField === "email" || verifyStatus.email === "error"}
                aria-describedby={errorField === "email" ? "credit-error-email" : undefined}
                autoComplete="email"
              />
            </VerifiedInputShell>
            <span className="block text-[11px] leading-snug text-slate-500">
              Corporate domain required. Gmail, Yahoo, Outlook, Hotmail, etc. are not accepted.
            </span>
            <FieldErrorText errorField={errorField} field="email" message={fieldError} />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={fieldLabel}>Website</span>
            <VerifiedInputShell status={verifyStatus.website || "idle"}>
              <Input
                id="credit-field-website"
                type="url"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                onBlur={(e) => {
                  const website = e.target.value.trim();
                  if (!website) {
                    resetVerify("website");
                    if (errorField === "website") clearFieldIssue();
                    return;
                  }
                  runVerify("website", () => {
                    const emailCheck = isValidCorporateEmail(form.email);
                    if (!emailCheck.ok) {
                      return {
                        ok: false,
                        error:
                          "Enter a valid corporate email first so we can match your website domain.",
                      };
                    }
                    const check = emailMatchesWebsiteDomain(form.email, website);
                    return check.ok ? { ok: true } : { ok: false, error: check.error };
                  });
                }}
                placeholder="https://www.company.com"
                className={fieldControlClass(
                  inputClass,
                  errorField,
                  "website",
                  "input",
                  verifyStatus.website || "idle"
                )}
                aria-invalid={errorField === "website" || verifyStatus.website === "error"}
                aria-describedby={errorField === "website" ? "credit-error-website" : undefined}
                inputMode="url"
              />
            </VerifiedInputShell>
            <span className="block text-[11px] leading-snug text-slate-500">
              Optional. If provided, the site domain should match your corporate email domain.
            </span>
            <FieldErrorText errorField={errorField} field="website" message={fieldError} />
          </label>
        </div>
      </section>

      {/* Section 2 */}
      <section className={sectionShell}>
        <SectionTitle icon={Users} title="2. Contact Information" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <p className={`${fieldLabel} sm:col-span-3`}>Accounts Payable Contact *</p>
          <div className="space-y-1.5">
            <Input
              id="credit-field-apContactName"
              required
              value={form.apContactName}
              onChange={(e) => update("apContactName", e.target.value)}
              placeholder="AP name"
              className={fieldControlClass(inputClass, errorField, "apContactName")}
              aria-invalid={errorField === "apContactName"}
              aria-describedby={
                errorField === "apContactName" ? "credit-error-apContactName" : undefined
              }
            />
            <FieldErrorText errorField={errorField} field="apContactName" message={fieldError} />
          </div>
          <div className="space-y-1.5">
            <Input
              id="credit-field-apPhone"
              required
              type="tel"
              value={form.apPhone}
              onChange={(e) => update("apPhone", e.target.value)}
              placeholder="AP phone"
              className={fieldControlClass(inputClass, errorField, "apPhone")}
              aria-invalid={errorField === "apPhone"}
              aria-describedby={errorField === "apPhone" ? "credit-error-apPhone" : undefined}
            />
            <FieldErrorText errorField={errorField} field="apPhone" message={fieldError} />
          </div>
          <div className="space-y-1.5">
            <VerifiedInputShell status={verifyStatus.apEmail || "idle"}>
              <Input
                id="credit-field-apEmail"
                required
                type="email"
                value={form.apEmail}
                onChange={(e) => update("apEmail", e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (!value) {
                    resetVerify("apEmail");
                    return;
                  }
                  runVerify("apEmail", () => {
                    const check = isValidCorporateEmail(value);
                    if (check.ok) return { ok: true };
                    return {
                      ok: false,
                      error: check.error?.includes("webmail")
                        ? "Accounts Payable email must be a company address (not Gmail, Yahoo, Outlook, etc.)."
                        : check.error,
                    };
                  });
                }}
                placeholder="ap@company.com"
                className={fieldControlClass(
                  inputClass,
                  errorField,
                  "apEmail",
                  "input",
                  verifyStatus.apEmail || "idle"
                )}
                aria-invalid={errorField === "apEmail" || verifyStatus.apEmail === "error"}
                aria-describedby={errorField === "apEmail" ? "credit-error-apEmail" : undefined}
              />
            </VerifiedInputShell>
            <span className="block text-[11px] leading-snug text-slate-500">
              AP email must also be a company domain (no free webmail).
            </span>
            <FieldErrorText errorField={errorField} field="apEmail" message={fieldError} />
          </div>

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
        {[0, 1, 2].map((index) => {
          const companyField = `ref${index + 1}CompanyName` as CreditApplicationErrorField;
          const contactField = `ref${index + 1}ContactPerson` as CreditApplicationErrorField;
          const phoneField = `ref${index + 1}Phone` as CreditApplicationErrorField;
          return (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Commercial Reference #{index + 1} *
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Input
                    id={`credit-field-${companyField}`}
                    required
                    value={refs[index as 0 | 1 | 2].companyName}
                    onChange={(e) =>
                      updateRef(index as 0 | 1 | 2, "companyName", e.target.value)
                    }
                    placeholder="Company name"
                    className={fieldControlClass(inputClass, errorField, companyField)}
                    aria-invalid={errorField === companyField}
                    aria-describedby={
                      errorField === companyField ? `credit-error-${companyField}` : undefined
                    }
                  />
                  <FieldErrorText
                    errorField={errorField}
                    field={companyField}
                    message={fieldError}
                  />
                </div>
                <div className="space-y-1.5">
                  <Input
                    id={`credit-field-${contactField}`}
                    required
                    value={refs[index as 0 | 1 | 2].contactPerson}
                    onChange={(e) =>
                      updateRef(index as 0 | 1 | 2, "contactPerson", e.target.value)
                    }
                    placeholder="Contact person"
                    className={fieldControlClass(inputClass, errorField, contactField)}
                    aria-invalid={errorField === contactField}
                    aria-describedby={
                      errorField === contactField ? `credit-error-${contactField}` : undefined
                    }
                  />
                  <FieldErrorText
                    errorField={errorField}
                    field={contactField}
                    message={fieldError}
                  />
                </div>
                <div className="space-y-1.5">
                  <Input
                    id={`credit-field-${phoneField}`}
                    required
                    type="tel"
                    value={refs[index as 0 | 1 | 2].phone}
                    onChange={(e) => updateRef(index as 0 | 1 | 2, "phone", e.target.value)}
                    placeholder="Phone"
                    className={fieldControlClass(inputClass, errorField, phoneField)}
                    aria-invalid={errorField === phoneField}
                    aria-describedby={
                      errorField === phoneField ? `credit-error-${phoneField}` : undefined
                    }
                  />
                  <FieldErrorText errorField={errorField} field={phoneField} message={fieldError} />
                </div>
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
          );
        })}
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
              id="credit-field-authorizedRepresentativeName"
              required
              value={form.authorizedRepresentativeName}
              onChange={(e) =>
                update("authorizedRepresentativeName", e.target.value)
              }
              className={fieldControlClass(
                inputClass,
                errorField,
                "authorizedRepresentativeName"
              )}
              aria-invalid={errorField === "authorizedRepresentativeName"}
              aria-describedby={
                errorField === "authorizedRepresentativeName"
                  ? "credit-error-authorizedRepresentativeName"
                  : undefined
              }
              autoComplete="name"
            />
            <FieldErrorText
              errorField={errorField}
              field="authorizedRepresentativeName"
              message={fieldError}
            />
          </label>
          <label className="block space-y-1.5">
            <span className={fieldLabel}>Title *</span>
            <Input
              id="credit-field-title"
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Owner / CFO / Controller"
              className={fieldControlClass(inputClass, errorField, "title")}
              aria-invalid={errorField === "title"}
              aria-describedby={errorField === "title" ? "credit-error-title" : undefined}
              autoComplete="organization-title"
            />
            <FieldErrorText errorField={errorField} field="title" message={fieldError} />
          </label>
          <label className="block space-y-1.5 sm:col-span-2">
            <span className={fieldLabel}>E-Signature (type full legal name) *</span>
            <Input
              id="credit-field-eSignature"
              required
              value={form.eSignature}
              onChange={(e) => update("eSignature", e.target.value)}
              placeholder="Type your full legal name as signature"
              className={`${fieldControlClass(inputClass, errorField, "eSignature")} font-serif italic`}
              aria-invalid={errorField === "eSignature"}
              aria-describedby={
                errorField === "eSignature" ? "credit-error-eSignature" : undefined
              }
            />
            <FieldErrorText errorField={errorField} field="eSignature" message={fieldError} />
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

      <div
        id="credit-field-turnstile"
        className={`space-y-3 rounded-2xl border bg-white p-3.5 sm:p-4 ${
          errorField === "turnstile"
            ? "border-rose-300 ring-2 ring-rose-200"
            : "border-slate-200"
        }`}
      >
        {fieldError ? (
          <p
            ref={errorBannerRef}
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] leading-snug text-rose-800"
          >
            {summaryLabel ? (
              <>
                <span className="font-black">{summaryLabel}:</span> {fieldError}
              </>
            ) : (
              fieldError
            )}
          </p>
        ) : null}
        <div className="overflow-x-auto" data-credit-auth-ignore="true">
          <TurnstileField onToken={setTurnstileToken} />
        </div>
        <FieldErrorText errorField={errorField} field="turnstile" message={fieldError} />
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
    </>
  );
}
