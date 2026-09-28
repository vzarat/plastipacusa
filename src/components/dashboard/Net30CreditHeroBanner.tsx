"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, CreditCard, PhoneCall } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const Beams = dynamic(
  () => import("@/components/ui/Beams").then((m) => m.Beams),
  { ssr: false }
);

const FloatingCreditCards = dynamic(
  () =>
    import("@/components/ui/FloatingCreditCards").then(
      (m) => m.FloatingCreditCards
    ),
  { ssr: false }
);

/** Compact Net 30 hero — exclusive to the dashboard Commercial Credit page. */
export function Net30CreditHeroBanner() {
  const { locale, t } = useLanguage();
  const isSpanish = locale === "es";

  return (
    <section className="relative w-full overflow-hidden rounded-3xl border border-slate-800/40 bg-[#000d23] text-white shadow-sm">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-16 z-0 overflow-hidden opacity-100 pointer-events-none scale-125">
          <Beams
            backgroundColor="#000d23"
            beamColor="#00286a"
            beamHeight={40}
            beamNumber={50}
            beamWidth={2.8}
            lightColor="#ffffff"
            noiseIntensity={1.3}
            rotation={45}
            scale={0.35}
            speed={3.5}
          />
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center px-5 sm:px-8 py-8 sm:py-10">
        <div className="flex flex-col items-start space-y-3 sm:space-y-4 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-sky-100">
            <CreditCard className="w-3.5 h-3.5" />
            {t("dashboard.creditSlideBadge") || "Net 30 Credit"}
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
            {isSpanish
              ? "Crédito B2B y términos Net 30"
              : t("dashboard.creditSlideTitle") ||
                "B2B Credit & Net 30 Terms"}
          </h2>

          <p className="text-sm text-sky-100/90 leading-relaxed max-w-md">
            {isSpanish
              ? "Financia pedidos de pallet completo con pago a 30 días. Solicita tu límite y recibe respuesta en 24–48 horas hábiles."
              : t("dashboard.creditSlideSubtitle") ||
                "Finance full-pallet orders with 30-day payment terms. Request your limit and hear back within 24–48 business hours."}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1 w-full sm:w-auto">
            <a
              href="#credit-application-form"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity"
            >
              {isSpanish ? "Iniciar solicitud" : "Start Application"}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="tel:+19564003683"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-cyan-300" />
              (956) 400-3683
            </a>
          </div>

          <Link
            href="/dashboard/settings"
            className="text-[11px] sm:text-xs font-semibold text-sky-300 hover:text-white transition-colors underline-offset-2 hover:underline"
          >
            {isSpanish
              ? "Completar TAX ID en Ajustes →"
              : "Complete TAX ID in Settings →"}
          </Link>
        </div>

        <div className="relative hidden md:flex justify-end items-center min-h-[200px]">
          <div className="w-full max-w-[260px] origin-right scale-[0.85] xl:scale-95">
            <FloatingCreditCards className="!h-[200px] xl:!h-[220px] ml-auto" />
          </div>
        </div>
      </div>
    </section>
  );
}
