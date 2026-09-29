"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Save, Send, Eye } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await loadEmailTemplateForAdmin();
      if (cancelled) return;
      setTemplate(result.template || { ...DEFAULT_EMAIL_TEMPLATE });
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
        toast.success("Template saved.");
      } else {
        toast.error(result.error || "Could not save template.");
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
        toast.success(`Test email sent to ${testEmail}`);
      } else {
        toast.error(result.error || "Could not send test email.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
        Loading template…
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
            Order Confirmation
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Customize branding, message, and footer for Resend order emails.
            Live preview updates with a sample order (#TEST-123).
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
          Save template
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Content
            </h2>
            <Field label="Subject (use {{orderId}})">
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
            <Field label="Greeting prefix">
              <input
                className={inputClass}
                value={template.greetingPrefix}
                onChange={(e) => update("greetingPrefix", e.target.value)}
              />
            </Field>
            <Field label="Main message">
              <textarea
                className={`${inputClass} min-h-[96px] resize-y`}
                value={template.mainMessage}
                onChange={(e) => update("mainMessage", e.target.value)}
              />
            </Field>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Brand colors
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["primaryColor", "Primary / blue"],
                  ["navyColor", "Navy header"],
                  ["backgroundColor", "Background"],
                  ["panelColor", "Panel"],
                  ["textColor", "Text"],
                  ["mutedColor", "Muted text"],
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
              Footer / contact
            </h2>
            <Field label="Sales email">
              <input
                className={inputClass}
                value={template.footerSalesEmail}
                onChange={(e) => update("footerSalesEmail", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Phone US">
                <input
                  className={inputClass}
                  value={template.footerSupportPhoneUs}
                  onChange={(e) => update("footerSupportPhoneUs", e.target.value)}
                />
              </Field>
              <Field label="Phone MX">
                <input
                  className={inputClass}
                  value={template.footerSupportPhoneMx}
                  onChange={(e) => update("footerSupportPhoneMx", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Plant address">
              <textarea
                className={`${inputClass} min-h-[72px] resize-y`}
                value={template.footerAddress}
                onChange={(e) => update("footerAddress", e.target.value)}
              />
            </Field>
            <Field label="Website">
              <input
                className={inputClass}
                value={template.footerWebsite}
                onChange={(e) => update("footerWebsite", e.target.value)}
              />
            </Field>
            <Field label="Legal disclaimer">
              <textarea
                className={`${inputClass} min-h-[88px] resize-y`}
                value={template.legalDisclaimer}
                onChange={(e) => update("legalDisclaimer", e.target.value)}
              />
            </Field>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Send test email
            </h2>
            <Field label="Test recipient">
              <input
                type="email"
                className={inputClass}
                placeholder="you@company.com"
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
              Send test email
            </button>
            <p className="text-[11px] text-slate-500">
              Sends Order #TEST-123 with sample products using the current
              template (even if it is not saved).
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
