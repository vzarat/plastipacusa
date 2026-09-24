"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CreditCard, Percent, Truck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const AUTO_MS = 5500;

type Slide = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  bodyKey: string;
  href: string;
  ctaKey: string;
  panel: string;
};

const SLIDES: Slide[] = [
  {
    id: "b2b-offers",
    icon: Percent,
    titleKey: "dashboard.promo1Title",
    bodyKey: "dashboard.promo1Body",
    href: "/products?app=machine",
    ctaKey: "dashboard.promo1Cta",
    panel: "from-sky-600 via-blue-600 to-blue-800",
  },
  {
    id: "fast-shipping",
    icon: Truck,
    titleKey: "dashboard.promo2Title",
    bodyKey: "dashboard.promo2Body",
    href: "/products",
    ctaKey: "dashboard.promo2Cta",
    panel: "from-emerald-600 via-teal-600 to-cyan-800",
  },
  {
    id: "net30",
    icon: CreditCard,
    titleKey: "dashboard.promo3Title",
    bodyKey: "dashboard.promo3Body",
    href: "/credit-application",
    ctaKey: "dashboard.promo3Cta",
    panel: "from-indigo-600 via-blue-700 to-slate-900",
  },
];

export function DashboardPromoCarousel() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  const slide = SLIDES[index];
  const Icon = slide.icon;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label={t("dashboard.promoCarouselLabel")}
    >
      <div className="relative min-h-[220px] sm:min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute inset-0 bg-gradient-to-br ${slide.panel}`}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 85% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 10% 90%, rgba(255,255,255,0.12), transparent 40%)",
              }}
            />
            <div className="relative z-10 flex h-full min-h-[220px] sm:min-h-[260px] flex-col justify-center gap-6 py-10 sm:py-12 px-6 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white backdrop-blur-sm">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                    {t("dashboard.promoEyebrow")}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                    {t(slide.titleKey)}
                  </h2>
                  <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-xl">
                    {t(slide.bodyKey)}
                  </p>
                </div>
              </div>

              <Link
                href={slide.href}
                className="inline-flex items-center justify-center gap-2 self-start sm:self-center shrink-0 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 transition-colors"
              >
                {t(slide.ctaKey)}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="absolute bottom-4 right-5 z-20 flex items-center gap-1.5">
        {SLIDES.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-label={`${t("dashboard.promoSlide")} ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              i === index
                ? "w-6 bg-white"
                : "w-1.5 bg-white/45 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
