"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CreditCard,
  Package,
  Percent,
  PhoneCall,
  Truck,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { FloatingCreditCards } from "@/components/ui/FloatingCreditCards";

const Beams = dynamic(
  () => import("@/components/ui/Beams").then((m) => m.Beams),
  { ssr: false }
);

const AUTO_MS = 6000;

const HERO_WAREHOUSE_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/warehouse_storage_background.png";

const STRETCH_FILM_ROLLS_IMAGE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/STRETCH.png";

type StandardSlide = {
  id: string;
  kind: "standard";
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  bodyKey: string;
  href: string;
  ctaKey: string;
  panel: string;
};

type CreditSlide = {
  id: string;
  kind: "credit";
};

type FreeSampleSlide = {
  id: string;
  kind: "free-sample";
};

type Slide = StandardSlide | CreditSlide | FreeSampleSlide;

const SLIDES: Slide[] = [
  {
    id: "b2b-offers",
    kind: "standard",
    icon: Percent,
    titleKey: "dashboard.promo1Title",
    bodyKey: "dashboard.promo1Body",
    href: "/products?app=machine",
    ctaKey: "dashboard.promo1Cta",
    panel: "from-sky-600 via-blue-600 to-blue-800",
  },
  {
    id: "fast-shipping",
    kind: "standard",
    icon: Truck,
    titleKey: "dashboard.promo2Title",
    bodyKey: "dashboard.promo2Body",
    href: "/products",
    ctaKey: "dashboard.promo2Cta",
    panel: "from-emerald-600 via-teal-600 to-cyan-800",
  },
  {
    id: "commercial-credit",
    kind: "credit",
  },
  {
    id: "free-sample",
    kind: "free-sample",
  },
];

function CreditHeroSlide() {
  const { t } = useLanguage();

  return (
    <div className="absolute inset-0 bg-[#000d23] text-white overflow-hidden">
      {/* Same Beams treatment as /credit-application hero */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-16 z-0 overflow-hidden opacity-100 pointer-events-none scale-125">
          <Beams
            backgroundColor="#000d23"
            beamColor="#00286a"
            beamHeight={40}
            beamNumber={60}
            beamWidth={2.8}
            lightColor="#ffffff"
            noiseIntensity={1.3}
            rotation={45}
            scale={0.35}
            speed={3.5}
          />
        </div>
      </div>

      <div className="relative z-10 grid h-full min-h-[280px] sm:min-h-[320px] grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-center py-10 sm:py-12 px-6 sm:px-8">
        {/* Left — copy & CTAs */}
        <div className="flex flex-col items-start space-y-3 sm:space-y-4 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-sky-100">
            <CreditCard className="w-3.5 h-3.5" />
            {t("dashboard.creditSlideBadge")}
          </span>

          <h2 className="text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold text-white tracking-tight leading-tight">
            {t("dashboard.creditSlideTitle")}
          </h2>

          <p className="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-md">
            {t("dashboard.creditSlideSubtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-0.5 w-full sm:w-auto">
            <Link
              href="/credit-application"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 hover:opacity-95 transition-opacity"
            >
              {t("dashboard.creditSlideCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+19564003683"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-cyan-300" />
              (956) 400-3683
            </a>
          </div>

          <Link
            href="/products"
            className="text-[11px] sm:text-xs font-semibold text-sky-300 hover:text-white transition-colors underline-offset-2 hover:underline"
          >
            {t("dashboard.creditSlideBrowse")}
          </Link>
        </div>

        {/* Right — scaled floating cards */}
        <div className="relative hidden lg:flex justify-end items-center h-full min-h-[200px]">
          <div className="w-full max-w-[300px] origin-right scale-[0.72] xl:scale-[0.82]">
            <FloatingCreditCards className="!h-[220px] sm:!h-[240px] lg:!h-[240px] ml-auto" />
          </div>
        </div>

        {/* Compact cards peek on tablet */}
        <div className="relative flex lg:hidden justify-center sm:justify-end items-center pt-1 pb-2">
          <div className="w-full max-w-[240px] sm:max-w-[280px] origin-center scale-[0.62] sm:scale-[0.7] -my-8">
            <FloatingCreditCards className="!h-[200px] ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FreeSampleHeroSlide() {
  const { t } = useLanguage();

  return (
    <div className="absolute inset-0 bg-slate-900 text-white overflow-hidden">
      {/* Brighter warehouse backdrop — left-anchored gradient for text contrast */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src={HERO_WAREHOUSE_BG}
          alt=""
          fill
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="object-cover object-center brightness-110 contrast-105"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/40 to-transparent" />
      </div>

      <div className="relative z-10 grid h-full min-h-[280px] sm:min-h-[320px] grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-center py-10 sm:py-12 px-6 sm:px-8">
        {/* Left — copy & CTAs */}
        <div className="flex flex-col items-start space-y-3 sm:space-y-4 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/55 border border-blue-400/35 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200 backdrop-blur-sm shadow-sm">
            <Package className="w-3.5 h-3.5 text-blue-300" />
            {t("dashboard.sampleSlideBadge")}
          </span>

          <h2 className="text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">
            {t("dashboard.sampleSlideTitle")}
          </h2>

          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed max-w-md drop-shadow-sm">
            {t("dashboard.sampleSlideSubtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-0.5 w-full sm:w-auto">
            <Link
              href="/free-sample"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-sky-500/25 hover:opacity-95 transition-opacity"
            >
              {t("dashboard.sampleSlideCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+19564003683"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 hover:bg-white/15 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-sky-300" />
              (956) 400-3683
            </a>
          </div>

          <Link
            href="/products"
            className="text-[11px] sm:text-xs font-semibold text-sky-200 hover:text-white transition-colors underline-offset-2 hover:underline"
          >
            {t("dashboard.sampleSlideLearn")}
          </Link>
        </div>

        {/* Right — stretch film rolls (mirrors credit card stack balance) */}
        <div className="relative hidden lg:flex justify-end items-end h-full min-h-[200px] self-stretch pb-0">
          <div className="relative w-full max-w-[280px] xl:max-w-[320px] flex items-end justify-center">
            <Image
              src={STRETCH_FILM_ROLLS_IMAGE}
              alt="Plastipac USA stretch film rolls"
              width={420}
              height={420}
              className="block object-contain object-bottom w-full h-auto max-h-[240px] xl:max-h-[260px] drop-shadow-2xl"
              priority={false}
            />
          </div>
        </div>

        {/* Compact product peek on smaller screens */}
        <div className="relative flex lg:hidden justify-center sm:justify-end items-end pt-1 -mb-2">
          <Image
            src={STRETCH_FILM_ROLLS_IMAGE}
            alt="Plastipac USA stretch film rolls"
            width={280}
            height={280}
            className="block object-contain object-bottom w-auto max-h-[140px] sm:max-h-[160px] drop-shadow-xl"
            priority={false}
          />
        </div>
      </div>
    </div>
  );
}

function StandardSlideView({ slide }: { slide: StandardSlide }) {
  const { t } = useLanguage();
  const Icon = slide.icon;

  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${slide.panel}`}>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 85% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 10% 90%, rgba(255,255,255,0.12), transparent 40%)",
        }}
      />
      <div className="relative z-10 flex h-full min-h-[280px] sm:min-h-[320px] flex-col justify-center gap-6 py-10 sm:py-12 px-6 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}

export function DashboardPromoCarousel() {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hoverHalf, setHoverHalf] = useState<"left" | "right" | "interactive" | null>(
    null
  );
  const containerRef = useRef<HTMLElement | null>(null);

  const goTo = useCallback((next: number) => {
    setIndex(((next % SLIDES.length) + SLIDES.length) % SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  const nextSlide = useCallback(() => {
    setIndex((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  const resolveHoverZone = useCallback(
    (clientX: number, target: EventTarget | null) => {
      if (
        target instanceof Element &&
        target.closest("button, a, input, textarea, select, label")
      ) {
        return "interactive" as const;
      }
      const el = containerRef.current;
      if (!el) return null;
      const { left, width } = el.getBoundingClientRect();
      if (width <= 0) return null;
      return clientX - left < width / 2 ? ("left" as const) : ("right" as const);
    },
    []
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setHoverHalf(resolveHoverZone(event.clientX, event.target));
    },
    [resolveHoverZone]
  );

  const handleMouseLeave = useCallback(() => {
    setPaused(false);
    setHoverHalf(null);
  }, []);

  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button, a, input, textarea, select, label")
      ) {
        // Let interactive elements keep their default action
        return;
      }

      const el = containerRef.current;
      if (!el) return;
      const { left, width } = el.getBoundingClientRect();
      if (width <= 0) return;

      if (event.clientX - left < width / 2) {
        prevSlide();
      } else {
        nextSlide();
      }
    },
    [nextSlide, prevSlide]
  );

  const slide = SLIDES[index];
  const cursorClass =
    hoverHalf === "interactive"
      ? "cursor-pointer"
      : hoverHalf === "left"
        ? "cursor-w-resize"
        : hoverHalf === "right"
          ? "cursor-e-resize"
          : "cursor-default";

  return (
    <section
      ref={containerRef}
      className={`relative overflow-hidden rounded-3xl border border-slate-200/80 shadow-sm select-none ${cursorClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleContainerClick}
      aria-roledescription="carousel"
      aria-label={t("dashboard.promoCarouselLabel")}
    >
      <div className="relative min-h-[280px] sm:min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {slide.kind === "credit" ? (
              <CreditHeroSlide />
            ) : slide.kind === "free-sample" ? (
              <FreeSampleHeroSlide />
            ) : (
              <StandardSlideView slide={slide} />
            )}
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
            onClick={(event) => {
              event.stopPropagation();
              goTo(i);
            }}
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
