"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, PhoneCall, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";
import { B2BCreditFlow } from "@/components/credit/B2BCreditFlow";
import { CreditApplicationForm } from "@/components/credit/CreditApplicationForm";
import { FloatingCreditCards } from "@/components/ui/FloatingCreditCards";

export function CreditApplicationContent() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50/60">
      <section className="relative border-b border-slate-800 bg-slate-950 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center overflow-hidden bg-slate-900 rounded-3xl p-8 md:p-12 relative">
            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(circle at 20% 30%, rgba(56,189,248,0.22), transparent 42%), radial-gradient(circle at 85% 70%, rgba(37,99,235,0.35), transparent 40%), linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #0F172A 100%)",
              }}
              aria-hidden
            />

            {/* Left — Copy & CTAs */}
            <div className="relative z-10 text-left flex flex-col items-start space-y-5">
              <Badge className="bg-white/10 backdrop-blur-md border border-white/20 text-sky-100 uppercase tracking-[0.16em] text-[11px] font-bold">
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                {t("credit.badge")}
              </Badge>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Apply for B2B Credit & Net 30 Terms
              </h1>

              <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed max-w-xl">
                {t("credit.subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 w-full sm:w-auto">
                <a
                  href="#credit-application-form"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity"
                >
                  Start Credit Application
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="tel:+19564003683"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-cyan-300" />
                  (956) 400-3683
                </a>
              </div>

              <Link
                href="/products"
                className="text-xs font-semibold text-sky-300 hover:text-white transition-colors underline-offset-2 hover:underline"
              >
                Browse catalog while you apply →
              </Link>
            </div>

            {/* Right — Floating cards */}
            <div className="relative z-10 flex justify-end items-end min-h-[260px] lg:min-h-[320px] -mb-8 md:-mb-12">
              <FloatingCreditCards className="w-full max-w-md ml-auto" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-700" />
          <p className="leading-relaxed">{t("credit.notice")}</p>
        </div>

        <B2BCreditFlow />
        <div id="credit-application-form">
          <CreditApplicationForm />
        </div>
      </section>
    </div>
  );
}
