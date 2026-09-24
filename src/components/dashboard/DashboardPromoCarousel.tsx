"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CreditCard,
  Flag,
  Package,
  PhoneCall,
  Truck,
} from "lucide-react";
import {
  USAMap,
  StateAbbreviations,
  type USAStateAbbreviation,
} from "@mirawision/usa-map-react";
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

const MAP_HUB_FILL = "#DC2626";
const MAP_HUB_HOVER = "#B91C1C";
const MAP_STANDARD_FILL = "#93C5FD";
const MAP_STANDARD_HOVER = "#60A5FA";
const MAP_STROKE = "#FFFFFF";
const MAP_HUB_STATES = new Set(["TX", "CA", "IL", "FL", "GA"]);

type CreditSlide = { id: string; kind: "credit" };
type FreeSampleSlide = { id: string; kind: "free-sample" };
type NationwideSlide = { id: string; kind: "nationwide" };
type Slide = CreditSlide | FreeSampleSlide | NationwideSlide;

const SLIDES: Slide[] = [
  { id: "commercial-credit", kind: "credit" },
  { id: "free-sample", kind: "free-sample" },
  { id: "nationwide-shipping", kind: "nationwide" },
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
    <div className="absolute inset-0 bg-slate-950 text-white overflow-hidden">
      {/* Uniform dark overlay matching homepage Hero */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src={HERO_WAREHOUSE_BG}
          alt=""
          fill
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="object-cover object-center"
          priority={false}
        />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-brightness-75" />
      </div>

      <div className="relative z-10 h-full min-h-[280px] sm:min-h-[320px]">
        {/* Left — copy & CTAs */}
        <div className="relative z-10 flex h-full flex-col items-start justify-center space-y-3 sm:space-y-4 min-w-0 max-w-xl py-10 sm:py-12 px-6 sm:px-8 pr-[42%] sm:pr-[38%] lg:pr-4 pb-14 sm:pb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-blue-300 backdrop-blur-sm">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            {t("dashboard.sampleSlideBadge")}
          </span>

          <h2 className="text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold text-white tracking-tight leading-tight">
            {t("dashboard.sampleSlideTitle")}
          </h2>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md">
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
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-sm transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-sky-300" />
              (956) 400-3683
            </a>
          </div>

          <Link
            href="/products"
            className="text-[11px] sm:text-xs font-semibold text-sky-300 hover:text-white transition-colors underline-offset-2 hover:underline"
          >
            {t("dashboard.sampleSlideLearn")}
          </Link>
        </div>

        {/* Rolls anchored flush to bottom-right of the slide */}
        <div className="pointer-events-none absolute bottom-0 right-4 sm:right-8 lg:right-12 z-10 w-[160px] sm:w-[200px] lg:w-[260px] xl:w-[300px]">
          <Image
            src={STRETCH_FILM_ROLLS_IMAGE}
            alt="Plastipac USA stretch film rolls"
            width={480}
            height={480}
            className="block w-full h-auto object-contain object-bottom align-bottom mb-0 pb-0 drop-shadow-2xl"
            priority={false}
          />
        </div>
      </div>
    </div>
  );
}

function NationwideShippingSlide() {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState<USAStateAbbreviation | null>(null);

  const customStates = useMemo(() => {
    const settings: Record<
      string,
      {
        fill: string;
        stroke: string;
        onHover: (state: USAStateAbbreviation) => void;
        onLeave: () => void;
      }
    > = {};

    StateAbbreviations.forEach((state) => {
      const isHub = MAP_HUB_STATES.has(state);
      const isHovered = hovered === state;
      let fill = isHub ? MAP_HUB_FILL : MAP_STANDARD_FILL;
      if (isHovered) {
        fill = isHub ? MAP_HUB_HOVER : MAP_STANDARD_HOVER;
      }

      settings[state] = {
        fill,
        stroke: MAP_STROKE,
        onHover: (abbr) => setHovered(abbr),
        onLeave: () => setHovered(null),
      };
    });

    return settings;
  }, [hovered]);

  return (
    <div className="absolute inset-0 bg-[#0a1628] text-white overflow-hidden border-y border-red-600/40">
      {/* Patriotic navy field + subtle red accent rail */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 30%, rgba(30,58,138,0.55), transparent 55%), radial-gradient(ellipse at 90% 80%, rgba(185,28,28,0.18), transparent 45%), #0a1628",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-700 via-white/80 to-red-700 z-20" />

      <div className="relative z-10 grid h-full min-h-[280px] sm:min-h-[320px] grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 items-center py-10 sm:py-12 px-6 sm:px-8">
        <div className="flex flex-col items-start space-y-3 sm:space-y-4 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-700/20 border border-red-500/50 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-red-100">
            <Flag className="w-3.5 h-3.5 text-red-400" />
            {t("dashboard.shippingSlideBadge")}
          </span>

          <h2 className="text-xl sm:text-2xl lg:text-[1.7rem] font-extrabold text-white tracking-tight leading-tight uppercase">
            {t("dashboard.shippingSlideTitle")}
          </h2>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md">
            {t("dashboard.shippingSlideSubtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-0.5 w-full sm:w-auto">
            <Link
              href="/#usa-coverage"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#0a1628] px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-lg shadow-black/20 hover:bg-slate-100 transition-colors border border-red-600/30"
            >
              <Truck className="w-4 h-4 text-red-600" />
              {t("dashboard.shippingSlideCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+19564003683"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-sky-300" />
              (956) 400-3683
            </a>
          </div>
        </div>

        {/* USA map — same component as homepage coverage section */}
        <div
          className="relative flex justify-center lg:justify-end items-center min-h-[160px] lg:min-h-[220px]"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="w-full max-w-[360px] xl:max-w-[420px] rounded-2xl border border-white/15 bg-[#0c1c36]/70 p-2 sm:p-3 shadow-xl shadow-black/30 backdrop-blur-sm [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[200px] sm:[&_svg]:max-h-[230px] pointer-events-auto">
            <USAMap
              defaultState={{
                fill: MAP_STANDARD_FILL,
                stroke: MAP_STROKE,
                label: { enabled: false },
                tooltip: { enabled: false },
              }}
              customStates={customStates}
              mapSettings={{ width: "100%", height: "auto" }}
              className="usa-coverage-dashboard-slide-map"
            />
          </div>
        </div>
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
              <NationwideShippingSlide />
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
