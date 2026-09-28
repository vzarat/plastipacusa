"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  Loader2,
  Mail,
  Menu,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { UserProfile } from "@/actions/auth";
import {
  submitCreditApplication,
  type MyCreditStatusInfo,
} from "@/actions/credit-applications";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { Net30CreditHeroBanner } from "@/components/dashboard/Net30CreditHeroBanner";
import { useLanguage } from "@/context/LanguageContext";
import { formatCurrency } from "@/lib/utils";
import {
  formatEinInput,
  isValidUsEin,
} from "@/components/dashboard/TaxComplianceModal";

interface DashboardCreditClientProps {
  profile: UserProfile;
  creditStatus: MyCreditStatusInfo;
}

function statusPresentation(
  status: MyCreditStatusInfo["status"],
  creditLimit: number,
  isSpanish: boolean
) {
  if (status === "approved") {
    return {
      label: isSpanish
        ? `Crédito activo — Límite ${formatCurrency(creditLimit)}`
        : `Active Credit Limit — ${formatCurrency(creditLimit)}`,
      Icon: CheckCircle2,
      shell:
        "border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-white text-emerald-950",
      badge: "bg-emerald-600 text-white",
      icon: "text-emerald-700",
    };
  }
  if (status === "pending") {
    return {
      label: isSpanish ? "En revisión" : "Under Review",
      Icon: Clock,
      shell:
        "border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/80 to-white text-sky-950",
      badge: "bg-sky-600 text-white",
      icon: "text-sky-700",
    };
  }
  if (status === "rejected") {
    return {
      label: isSpanish ? "Rechazado" : "Rejected",
      Icon: XCircle,
      shell:
        "border-rose-300 bg-gradient-to-br from-rose-50 via-rose-50/80 to-white text-rose-950",
      badge: "bg-rose-600 text-white",
      icon: "text-rose-700",
    };
  }
  return {
    label: isSpanish ? "Sin solicitud" : "Not Applied",
    Icon: FileCheck,
    shell:
      "border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50/70 to-white text-amber-950",
    badge: "bg-amber-500 text-white",
    icon: "text-amber-700",
  };
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-400 transition-shadow";

export function DashboardCreditClient({
  profile,
  creditStatus: initialStatus,
}: DashboardCreditClientProps) {
  const { locale } = useLanguage();
  const isSpanish = locale === "es";
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [creditStatus, setCreditStatus] = useState(initialStatus);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    companyName: profile.companyName || "",
    contactName: profile.fullName || "",
    workEmail: profile.email || "",
    phone: profile.phone || "",
    taxIdEin: initialStatus.taxId || profile.taxId || "",
    desiredCreditLimit: "",
    notes: "",
  });

  const canApply =
    creditStatus.status === "not_applied" || creditStatus.status === "rejected";

  const statusUi = statusPresentation(
    creditStatus.status,
    creditStatus.creditLimit,
    isSpanish
  );
  const StatusIcon = statusUi.Icon;

  const steps = [
    {
      n: "01",
      title: isSpanish
        ? "Cuenta B2B activa y TAX ID / FEIN"
        : "Active B2B Account & TAX ID / FEIN",
      body: isSpanish
        ? "Mantén tu perfil verificado con EIN en archivo desde Ajustes."
        : "Keep your profile verified with an EIN on file from Settings.",
      icon: Building2,
    },
    {
      n: "02",
      title: isSpanish
        ? "Referencias comerciales o banco"
        : "Trade References or Bank Verification",
      body: isSpanish
        ? "Opcional para límites más altos — añádelas en notas o te las solicitaremos."
        : "Optional for higher limits — add them in notes or we will request them.",
      icon: FileText,
    },
    {
      n: "03",
      title: isSpanish
        ? "Formulario con límite mensual"
        : "Application with Monthly Credit Limit",
      body: isSpanish
        ? "Solicita de $5,000 a $50,000+ USD según tu volumen de pallet."
        : "Request $5k–$50k+ USD based on your pallet volume needs.",
      icon: CreditCard,
    },
    {
      n: "04",
      title: isSpanish
        ? "Aprobación en 24–48 horas hábiles"
        : "Fast Approval in 24–48 Business Hours",
      body: isSpanish
        ? "Recibirás la decisión y el límite por correo electrónico."
        : "You will receive the decision and limit by email.",
      icon: Mail,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.companyName.trim() ||
      !form.contactName.trim() ||
      !form.workEmail.trim()
    ) {
      toast.error(
        isSpanish
          ? "Completa los datos de la empresa y el contacto."
          : "Please complete company and contact details."
      );
      return;
    }
    if (!form.phone.trim()) {
      toast.error(
        isSpanish ? "El teléfono es obligatorio." : "Phone number is required."
      );
      return;
    }
    if (!form.desiredCreditLimit.trim()) {
      toast.error(
        isSpanish
          ? "Indica el límite de crédito deseado."
          : "Please enter your desired credit limit."
      );
      return;
    }
    if (form.taxIdEin.trim() && !isValidUsEin(form.taxIdEin)) {
      toast.error(
        isSpanish
          ? "TAX ID / EIN inválido (XX-XXXXXXX)."
          : "Invalid TAX ID / EIN (XX-XXXXXXX)."
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitCreditApplication({
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        workEmail: form.workEmail.trim(),
        phone: form.phone.trim(),
        taxIdEin: form.taxIdEin.trim() || "Pending — to be provided",
        desiredCreditLimit: form.desiredCreditLimit.trim(),
        notes: form.notes.trim() || undefined,
        creditReference1: `Dashboard Net 30 application — desired limit $${form.desiredCreditLimit.trim()}`,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to submit application.");
        return;
      }

      setCreditStatus((prev) => ({
        ...prev,
        status: "pending",
        taxId: form.taxIdEin.trim() || prev.taxId,
      }));
      toast.success(
        result.message ||
          (isSpanish
            ? "Solicitud de crédito enviada."
            : "Credit application submitted.")
      );
      router.refresh();
    } catch {
      toast.error(
        isSpanish
          ? "No se pudo enviar la solicitud."
          : "Unable to submit application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 rounded-xl border border-slate-200 text-slate-600"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <p className="text-xs font-bold text-slate-800">
          {isSpanish ? "Crédito Comercial" : "Commercial Credit"}
        </p>
        <LanguageToggle showIcon={false} />
      </div>

      <DashboardSidebar
        profile={profile}
        activeKey="credit"
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNavigate={(key) => {
          if (key === "settings") {
            router.push("/dashboard/settings");
            return;
          }
          router.push(key === "overview" ? "/dashboard" : `/dashboard?tab=${key}`);
        }}
        backupPasswordPending={Boolean(profile.backupPasswordPending)}
      />

      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden"
        />
      )}

      <main className="flex-1 p-5 sm:p-8 lg:p-10 overflow-y-auto space-y-8 max-w-5xl">
        <Net30CreditHeroBanner />

        {/* High-contrast status card */}
        <section
          className={`rounded-3xl border-2 p-5 sm:p-6 shadow-sm ${statusUi.shell}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                {isSpanish ? "Estado de crédito" : "Credit Status"}
              </p>
              <div className="flex items-center gap-2.5">
                <StatusIcon className={`w-6 h-6 ${statusUi.icon}`} />
                <p className="text-xl sm:text-2xl font-black tracking-tight">
                  {statusUi.label}
                </p>
              </div>
              {creditStatus.status === "approved" && (
                <p className="text-xs font-semibold opacity-80">
                  {isSpanish ? "Términos:" : "Terms:"} {creditStatus.creditTerms}
                </p>
              )}
              {creditStatus.status === "not_applied" && (
                <p className="text-xs font-medium opacity-80 max-w-lg">
                  {isSpanish
                    ? "Aún no has solicitado Net 30. Completa el formulario abajo para empezar."
                    : "You have not applied for Net 30 yet. Complete the form below to get started."}
                </p>
              )}
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusUi.badge}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Net 30
            </span>
          </div>
        </section>

        {/* How it works — 4 clear steps */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              {isSpanish ? "Cómo funciona" : "How It Works"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isSpanish
                ? "Cuatro pasos claros para obtener términos Net 30."
                : "Four clear steps to unlock Net 30 payment terms."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.n}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-white">
                      {step.n}
                    </span>
                    <Icon className="w-4 h-4 text-sky-600" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Application form */}
        {canApply ? (
          <section
            id="credit-application-form"
            className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                {isSpanish
                  ? "Solicitud de crédito"
                  : "Credit Application Form"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {isSpanish
                  ? "Envía tu solicitud Net 30. Puedes actualizar TAX ID en Configuración en cualquier momento."
                  : "Submit your Net 30 request. You can update TAX ID anytime in Account Settings."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {isSpanish ? "Empresa" : "Company Name"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={form.companyName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, companyName: e.target.value }))
                    }
                    placeholder={
                      isSpanish
                        ? "Razón social legal"
                        : "Legal company name"
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {isSpanish ? "Contacto" : "Contact Name"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={form.contactName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contactName: e.target.value }))
                    }
                    placeholder={
                      isSpanish
                        ? "Nombre del responsable de compras"
                        : "Procurement contact full name"
                    }
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.workEmail}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, workEmail: e.target.value }))
                    }
                    placeholder="name@company.com"
                    className={inputClass}
                  />
                  <p className="text-[10px] text-slate-400">
                    {isSpanish
                      ? "Usaremos este correo para la decisión de crédito."
                      : "We will use this email for the credit decision."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {isSpanish ? "Teléfono" : "Business Phone"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="(956) 000-0000"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    {isSpanish
                      ? "Límite mensual deseado (USD)"
                      : "Desired Monthly Credit Limit (USD)"}{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    inputMode="decimal"
                    placeholder="10000"
                    value={form.desiredCreditLimit}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        desiredCreditLimit: e.target.value.replace(
                          /[^\d.]/g,
                          ""
                        ),
                      }))
                    }
                    className={`${inputClass} font-semibold`}
                  />
                  <p className="text-[10px] text-slate-400">
                    {isSpanish
                      ? "Rango típico: $5,000 – $50,000+ según volumen."
                      : "Typical range: $5,000 – $50,000+ based on volume."}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    TAX ID / FEIN{" "}
                    <span className="normal-case font-medium text-slate-400">
                      ({isSpanish ? "recomendado" : "recommended"})
                    </span>
                  </label>
                  <input
                    value={form.taxIdEin}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        taxIdEin: formatEinInput(e.target.value),
                      }))
                    }
                    placeholder="XX-XXXXXXX"
                    className={`${inputClass} font-mono`}
                  />
                  <p className="text-[10px] text-slate-400">
                    {isSpanish
                      ? "Formato EIN de EE.UU. También puedes guardarlo en Ajustes."
                      : "US EIN format. You can also save it in Settings."}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  {isSpanish
                    ? "Notas / referencias"
                    : "Notes / Trade References"}{" "}
                  <span className="normal-case font-medium text-slate-400">
                    ({isSpanish ? "opcional" : "optional"})
                  </span>
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className={`${inputClass} resize-y`}
                  placeholder={
                    isSpanish
                      ? "Volumen mensual estimado, referencias comerciales, banco…"
                      : "Estimated monthly volume, trade references, bank contacts…"
                  }
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-white px-5 py-3 text-sm font-bold disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {isSpanish ? "Enviar solicitud" : "Submit Application"}
                </button>
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  {isSpanish
                    ? "Actualizar TAX ID en Ajustes"
                    : "Update TAX ID in Settings"}
                </Link>
              </div>
            </form>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            {creditStatus.status === "pending"
              ? isSpanish
                ? "Tu solicitud está en revisión. Un especialista de crédito te contactará por correo en 24–48 horas hábiles."
                : "Your application is under review. A credit specialist will email you within 24–48 business hours."
              : isSpanish
                ? "Tu cuenta ya tiene términos Net 30 aprobados."
                : "Your account already has approved Net 30 terms."}
          </section>
        )}
      </main>
    </div>
  );
}
