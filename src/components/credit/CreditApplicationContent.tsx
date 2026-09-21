"use client";

import React from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { B2BCreditFlow } from "@/components/credit/B2BCreditFlow";
import { CreditApplicationForm } from "@/components/credit/CreditApplicationForm";

export function CreditApplicationContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50/60">
      <section
        className="relative overflow-hidden border-b border-slate-800"
        style={{
          background:
            "linear-gradient(135deg, #0F172A 0%, #1E3A8A 48%, #2563EB 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 20%, rgba(255,255,255,0.16), transparent 42%), radial-gradient(circle at 85% 75%, rgba(56,189,248,0.22), transparent 36%)",
          }}
          aria-hidden
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 text-center space-y-5">
          <Badge className="bg-white/10 border-white/20 text-sky-100 uppercase tracking-[0.16em] text-[11px] font-bold">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
            {t("credit.badge")}
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {t("credit.title")}
          </h1>
          <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed max-w-2xl mx-auto">
            {t("credit.subtitle")}
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-700" />
          <p className="leading-relaxed">{t("credit.notice")}</p>
        </div>

        <B2BCreditFlow />
        <CreditApplicationForm />
      </section>
    </div>
  );
}
