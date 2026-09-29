"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Save,
  Send,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  loadEmailTemplateForAdmin,
  saveEmailTemplate,
  sendTestOrderConfirmationEmail,
} from "@/actions/email-templates";
import {
  DEFAULT_EMAIL_TEMPLATE,
  SAMPLE_ORDER_CONTENT,
  buildOrderConfirmationHtml,
  type EmailTemplateBranding,
} from "@/lib/order-confirmation-email";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200";

export function AdminEmailTemplatesView() {
  const [template, setTemplate] = useState<EmailTemplateBranding>({
    ...DEFAULT_EMAIL_TEMPLATE,
  });
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sqlHint, setSqlHint] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await loadEmailTemplateForAdmin();
      if (cancelled) return;
      setTemplate(result.template);
      setPersisted(result.persisted);
      setSqlHint(result.sqlHint || null);
      setLoadError(result.error || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo(
    () => buildOrderConfirmationHtml(template, SAMPLE_ORDER_CONTENT),
    [template]
  );

  const update = <K extends keyof EmailTemplateBranding>(
    key: K,
    value: EmailTemplateBranding[K]
  ) => {
    setTemplate((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveEmailTemplate(template);
      if (result.success) {
        setPersisted(true);
        setSqlHint(null);
        setLoadError(null);
        toast.success("Plantilla guardada en Supabase.");
      } else {
        if (result.sqlHint) setSqlHint(result.sqlHint);
        toast.error(result.error || "No se pudo guardar la plantilla.");
      }
    });
  };

  const handleTestSend = () => {
    startTransition(async () => {
      const result = await sendTestOrderConfirmationEmail({
        to: testEmail,
        template,
      });
      if (result.success) {
        toast.success(`Correo de prueba enviado a ${testEmail}`);
      } else {
        toast.error(result.error || "No se pudo enviar el correo de prueba.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
        Cargando plantilla…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-900">
            <Mail className="h-3.5 w-3.5 text-blue-600" />
            Email Templates
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            Confirmación de compra
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Personaliza branding, mensaje y footer del correo Resend. La vista
            previa se actualiza en vivo con un pedido ficticio (#TEST-123).
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-950 disabled:opacity-60 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar plantilla
        </button>
      </div>

      {(sqlHint || loadError) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
          <div className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              {persisted
                ? "Aviso"
                : "La tabla `email_templates` aún no está disponible — se usan valores por defecto."}
            </span>
          </div>
          {loadError && <p className="text-xs text-amber-800">{loadError}</p>}
          {sqlHint && (
            <pre className="overflow-x-auto rounded-xl bg-white/80 p-3 text-[11px] leading-relaxed text-slate-700 border border-amber-100">
              {sqlHint}
            </pre>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Contenido
            </h2>
            <Field label="Asunto (usa {{orderId}})">
              <input
                className={inputClass}
                value={template.subject}
                onChange={(e) => update("subject", e.target.value)}
              />
            </Field>
            <Field label="Logo URL">
              <input
                className={inputClass}
                value={template.logoUrl}
                onChange={(e) => update("logoUrl", e.target.value)}
              />
            </Field>
            <Field label="Prefijo de saludo">
              <input
                className={inputClass}
                value={template.greetingPrefix}
                onChange={(e) => update("greetingPrefix", e.target.value)}
              />
            </Field>
            <Field label="Mensaje principal">
              <textarea
                className={`${inputClass} min-h-[96px] resize-y`}
                value={template.mainMessage}
                onChange={(e) => update("mainMessage", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Texto CTA">
                <input
                  className={inputClass}
                  value={template.ctaLabel}
                  onChange={(e) => update("ctaLabel", e.target.value)}
                />
              </Field>
              <Field label="URL CTA">
                <input
                  className={inputClass}
                  value={template.ctaUrl}
                  onChange={(e) => update("ctaUrl", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Colores corporativos
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["primaryColor", "Primario / azul"],
                  ["navyColor", "Navy header"],
                  ["backgroundColor", "Fondo"],
                  ["panelColor", "Panel"],
                  ["textColor", "Texto"],
                  ["mutedColor", "Texto secundario"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={template[key]}
                      onChange={(e) => update(key, e.target.value)}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                    />
                    <input
                      className={inputClass}
                      value={template[key]}
                      onChange={(e) => update(key, e.target.value)}
                    />
                  </div>
                </Field>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Footer / contacto
            </h2>
            <Field label="Email de ventas">
              <input
                className={inputClass}
                value={template.footerSalesEmail}
                onChange={(e) => update("footerSalesEmail", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Teléfono US">
                <input
                  className={inputClass}
                  value={template.footerSupportPhoneUs}
                  onChange={(e) => update("footerSupportPhoneUs", e.target.value)}
                />
              </Field>
              <Field label="Teléfono MX">
                <input
                  className={inputClass}
                  value={template.footerSupportPhoneMx}
                  onChange={(e) => update("footerSupportPhoneMx", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Dirección de planta">
              <textarea
                className={`${inputClass} min-h-[72px] resize-y`}
                value={template.footerAddress}
                onChange={(e) => update("footerAddress", e.target.value)}
              />
            </Field>
            <Field label="Sitio web">
              <input
                className={inputClass}
                value={template.footerWebsite}
                onChange={(e) => update("footerWebsite", e.target.value)}
              />
            </Field>
            <Field label="Disclaimer legal">
              <textarea
                className={`${inputClass} min-h-[88px] resize-y`}
                value={template.legalDisclaimer}
                onChange={(e) => update("legalDisclaimer", e.target.value)}
              />
            </Field>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Enviar correo de prueba
            </h2>
            <Field label="Correo para prueba">
              <input
                type="email"
                className={inputClass}
                placeholder="tu@empresa.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </Field>
            <button
              type="button"
              onClick={handleTestSend}
              disabled={isPending || !testEmail}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar correo de prueba
            </button>
            <p className="text-[11px] text-slate-500">
              Envía Order #TEST-123 con productos ficticios usando la plantilla
              actual (aunque aún no esté guardada).
            </p>
          </section>
        </div>

        <div className="xl:col-span-7">
          <section className="sticky top-20 rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-slate-50">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Eye className="h-4 w-4 text-sky-600" />
                Live Preview
              </div>
              <span className="truncate text-[11px] font-semibold text-slate-500 max-w-[60%]">
                {preview.subject}
              </span>
            </div>
            <div className="bg-slate-100/80 p-3 sm:p-4 max-h-[78vh] overflow-auto">
              <iframe
                title="Email preview"
                className="w-full min-h-[720px] rounded-xl border border-slate-200 bg-white"
                srcDoc={preview.html}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
