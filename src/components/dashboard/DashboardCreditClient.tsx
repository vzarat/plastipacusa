"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  Loader2,
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

function statusLabel(
  status: MyCreditStatusInfo["status"],
  creditLimit: number,
  isSpanish: boolean
): string {
  if (status === "approved") {
    return isSpanish
      ? `Aprobado — Límite ${formatCurrency(creditLimit)}`
      : `Approved - Limit ${formatCurrency(creditLimit)}`;
  }
  if (status === "pending") {
    return isSpanish ? "En revisión" : "Pending Review";
  }
  if (status === "rejected") {
    return isSpanish ? "Rechazado" : "Rejected";
  }
  return isSpanish ? "Sin solicitud" : "Not Applied";
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.contactName.trim() || !form.workEmail.trim()) {
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
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
            <CreditCard className="w-3.5 h-3.5" />
            Net 30
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isSpanish
              ? "Crédito Comercial Plastipac"
              : "Plastipac Commercial Credit"}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {isSpanish
              ? "Solicita términos Net 30 para pedidos de pallet completo y programas de reposición recurrente."
              : "Apply for Net 30 terms on full-pallet orders and recurring replenishment programs."}
          </p>
        </div>

        {/* Status tracker */}
        <section
          className={`rounded-3xl border p-5 sm:p-6 shadow-sm ${
            creditStatus.status === "approved"
              ? "border-emerald-200 bg-emerald-50/50"
              : creditStatus.status === "pending"
                ? "border-amber-200 bg-amber-50/40"
                : creditStatus.status === "rejected"
                  ? "border-rose-200 bg-rose-50/40"
                  : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            {isSpanish ? "Estado de crédito" : "Credit Status"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {creditStatus.status === "approved" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : creditStatus.status === "pending" ? (
              <Clock className="w-5 h-5 text-amber-600" />
            ) : creditStatus.status === "rejected" ? (
              <XCircle className="w-5 h-5 text-rose-600" />
            ) : (
              <FileCheck className="w-5 h-5 text-slate-400" />
            )}
            <p className="text-lg font-black text-slate-900">
              {statusLabel(
                creditStatus.status,
                creditStatus.creditLimit,
                isSpanish
              )}
            </p>
          </div>
          {creditStatus.status === "approved" && (
            <p className="mt-2 text-xs text-emerald-800 font-medium">
              {isSpanish ? "Términos:" : "Terms:"} {creditStatus.creditTerms}
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            {isSpanish ? "Cómo funciona" : "How It Works"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: isSpanish ? "Límites de crédito" : "Credit Limits",
                body: isSpanish
                  ? "Asignamos un límite de compra según historial, volumen estimado y referencias comerciales."
                  : "We assign a purchasing limit based on history, estimated volume, and trade references.",
              },
              {
                title: isSpanish
                  ? "Términos de pago a 30 días"
                  : "30-Day Payment Terms",
                body: isSpanish
                  ? "Paga dentro de 30 días desde la factura — ideal para flujo de caja en programas de pallet."
                  : "Pay within 30 days of invoice — ideal for cash-flow on pallet programs.",
              },
              {
                title: isSpanish ? "Requisitos" : "Requirements",
                body: isSpanish
                  ? "Cuenta B2B activa, datos de empresa, TAX ID / EIN (recomendado) y límite deseado."
                  : "Active B2B account, company details, TAX ID / EIN (recommended), and desired limit.",
              },
              {
                title: isSpanish
                  ? "Proceso de aprobación"
                  : "Approval Process",
                body: isSpanish
                  ? "Revisión por el equipo de crédito, usualmente en 1–3 días hábiles. Te notificamos por correo."
                  : "Credit team review, typically 1–3 business days. We notify you by email.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
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
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {isSpanish ? "Empresa" : "Company Name"} *
                  </label>
                  <input
                    required
                    value={form.companyName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, companyName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {isSpanish ? "Contacto" : "Contact Name"} *
                  </label>
                  <input
                    required
                    value={form.contactName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, contactName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.workEmail}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, workEmail: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {isSpanish ? "Teléfono" : "Phone"} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {isSpanish
                      ? "Límite de crédito deseado (USD)"
                      : "Desired Credit Limit (USD)"}{" "}
                    *
                  </label>
                  <input
                    required
                    inputMode="decimal"
                    placeholder="10000"
                    value={form.desiredCreditLimit}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        desiredCreditLimit: e.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    TAX ID / EIN{" "}
                    <span className="normal-case font-medium text-slate-400">
                      ({isSpanish ? "opcional" : "optional"})
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
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isSpanish ? "Notas" : "Notes"}{" "}
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
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm resize-y"
                  placeholder={
                    isSpanish
                      ? "Volumen mensual estimado, referencias, etc."
                      : "Estimated monthly volume, trade references, etc."
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
                ? "Tu solicitud está en revisión. Un especialista de crédito te contactará pronto."
                : "Your application is under review. A credit specialist will follow up shortly."
              : isSpanish
                ? "Tu cuenta ya tiene términos Net 30 aprobados."
                : "Your account already has approved Net 30 terms."}
          </section>
        )}
      </main>
    </div>
  );
}
