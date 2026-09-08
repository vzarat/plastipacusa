"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Box, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";

export function Hero() {
  const { t, language } = useLanguage();

  return (
    <section className="relative isolate overflow-hidden bg-slate-950 py-16 md:py-24 border-b border-slate-800">
      {/* Background Image Container */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/warehouse_storage_background.png"
          alt="Plastipac Warehouse Storage"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Dark High-Contrast Overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-brightness-75" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold shadow-sm backdrop-blur-xs">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>{t("hero.badge")}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              {t("hero.titlePart1")} <br />
              <span className="text-blue-400">
                {t("hero.titlePart2")}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed font-normal">
              {t("hero.description")}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Button
                asChild
                size="lg"
                variant="gradient"
                className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
              >
                <Link href="/products">
                  <span>{t("hero.exploreBtn")}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Link
                href="#inquiry-form"
                className="w-full sm:w-auto inline-flex items-center justify-center border border-white/30 bg-white/5 hover:bg-white/10 text-white font-medium h-12 px-6 rounded-xl backdrop-blur-sm transition-all shadow-sm cursor-pointer"
              >
                <span className="text-white font-medium">{t("hero.quoteBtn")}</span>
              </Link>
            </div>

            {/* Quick Specs Bulletpoints / Trust Badges */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/10 text-left">
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{t("hero.badgePreStretchTitle")}</div>
                  <div className="text-[11px] text-slate-300">{t("hero.badgePreStretchSub")}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{t("hero.badgePunctureTitle")}</div>
                  <div className="text-[11px] text-slate-300">{t("hero.badgePunctureSub")}</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{t("hero.badgeFactoryTitle")}</div>
                  <div className="text-[11px] text-slate-300">{t("hero.badgeFactorySub")}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Featured Product Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-white/20 bg-white/95 backdrop-blur-md p-7 shadow-2xl shadow-black/40">
              <div className="absolute -top-3 right-6">
                <Badge variant="gradient" className="shadow-md shadow-sky-500/20 font-bold px-3 py-1">
                  {t("hero.flagshipSeries")}
                </Badge>
              </div>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Box className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase text-sky-600 font-bold">
                    {t("hero.seriesName")}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {t("hero.floatingCardTitle")}
                  </h3>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100 text-xs">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t("hero.filmGauge")}</span>
                  <span className="font-bold text-slate-900 text-sm">{t("hero.gaugeValue")}</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t("hero.width")}</span>
                  <span className="font-bold text-slate-900 text-sm">{t("hero.widthValue")}</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t("hero.application")}</span>
                  <span className="font-bold text-sky-700 text-sm">{t("hero.appValue")}</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">{t("hero.startingAt")}</span>
                  <span className="font-extrabold text-slate-900 text-sm">{t("hero.priceValue")}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">{t("hero.readyToShip")}</span>
                <Button asChild variant="gradient" size="sm" className="gap-1.5 shadow-sm">
                  <Link href="/products/stretch-film-18-x-50-ga-x-1000ft">
                    <span>{t("hero.viewMatrix")}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const HeroBanner = Hero;
export default Hero;
