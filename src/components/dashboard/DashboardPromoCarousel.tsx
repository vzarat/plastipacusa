"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
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
const SWIPE_THRESHOLD = 56;

const HERO_WAREHOUSE_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/warehouse_storage_background.png";

const STRETCH_FILM_ROLLS_IMAGE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/STRETCH.png";

const AMERICAN_FLAG_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/1140-american-flag-myths-esp.jpg";

const MAP_HUB_FILL = "#DC2626";
const MAP_HUB_HOVER = "#B91C1C";
const MAP_STANDARD_FILL = "#93C5FD";
const MAP_STANDARD_HOVER = "#60A5FA";
const MAP_STROKE = "#FFFFFF";
const MAP_HUB_STATES = new Set(["TX", "CA", "IL", "FL", "GA"]);

const SLIDE_MIN_H = "md:min-h-[260px]";
const SLIDE_SHELL =
  "relative md:absolute md:inset-0 text-white overflow-hidden";
const SLIDE_PAD = "p-5 md:p-8 lg:p-10";
const TITLE_CLASS =
  "text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight";
const SUBTITLE_CLASS =
  "text-xs sm:text-sm text-white/85 leading-relaxed max-w-md";
const CTA_ROW =
  "flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-4 w-full sm:w-auto pt-0.5";
const CTA_PRIMARY =
  "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition-opacity";
const CTA_SECONDARY =
  "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors";

type CreditSlide = { id: string; kind: "credit" };
type FreeSampleSlide = { id: string; kind: "free-sample" };
type NationwideSlide = { id: string; kind: "nationwide" };
type Slide = CreditSlide | FreeSampleSlide | NationwideSlide;

const SLIDES: Slide[] = [
  { id: "commercial-credit", kind: "credit" },
  { id: "free-sample", kind: "free-sample" },
  { id: "nationwide-shipping", kind: "nationwide" },
];

/**
 * Remote slide background with pulse skeleton + opacity fade-in on load.
 * Overlay + content sit above this layer so CTAs stay interactive.
 */
function SlideBackgroundImage({
  src,
  overlayClassName = "bg-slate-950/80 backdrop-brightness-75",
}: {
  src: string;
  overlayClassName?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        className={`absolute inset-0 bg-slate-950 animate-pulse transition-opacity duration-500 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden
      />
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 1280px) 100vw, 1200px"
        className={`object-cover object-center transition-opacity duration-700 ease-in-out ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        priority={false}
        onLoad={() => setLoaded(true)}
      />
      <div className={`absolute inset-0 ${overlayClassName}`} />
    </div>
  );
}

function CreditHeroSlide() {
  const { t } = useLanguage();

  return (
    <div className={`${SLIDE_SHELL} bg-[#000d23]`}>
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

      <div
        className={`relative z-10 grid h-full ${SLIDE_MIN_H} grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-center ${SLIDE_PAD}`}
      >
        <div className="flex flex-col items-start space-y-3 sm:space-y-4 min-w-0 relative z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-sky-100">
            <CreditCard className="w-3.5 h-3.5" />
            {t("dashboard.creditSlideBadge")}
          </span>

          <h2 className={TITLE_CLASS}>{t("dashboard.creditSlideTitle")}</h2>
          <p className={`${SUBTITLE_CLASS} text-sky-100/90`}>
            {t("dashboard.creditSlideSubtitle")}
          </p>

          <div className={CTA_ROW}>
            <Link
              href="/credit-application"
              className={`${CTA_PRIMARY} bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:opacity-95`}
            >
              {t("dashboard.creditSlideCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+19564003683"
              className={`${CTA_SECONDARY} bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/15`}
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

        {/* Credit cards — desktop only */}
        <div className="relative hidden md:flex justify-end items-center h-full min-h-[180px]">
          <div className="w-full max-w-[280px] origin-right scale-[0.78] xl:scale-[0.88]">
            <FloatingCreditCards className="!h-[220px] lg:!h-[240px] ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FreeSampleHeroSlide() {
  const { t } = useLanguage();

  return (
    <div className={`${SLIDE_SHELL} bg-slate-950`}>
      <SlideBackgroundImage src={HERO_WAREHOUSE_BG} />

      <div className={`relative z-10 h-full ${SLIDE_MIN_H}`}>
        <div
          className={`relative z-20 flex h-full flex-col items-start justify-center space-y-3 sm:space-y-4 min-w-0 max-w-xl ${SLIDE_PAD} md:pr-[30%] lg:pr-10`}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-blue-300 backdrop-blur-sm">
            <Package className="w-3.5 h-3.5 text-blue-400" />
            {t("dashboard.sampleSlideBadge")}
          </span>

          <h2 className={TITLE_CLASS}>{t("dashboard.sampleSlideTitle")}</h2>
          <p className={`${SUBTITLE_CLASS} text-slate-200`}>
            {t("dashboard.sampleSlideSubtitle")}
          </p>

          <div className={CTA_ROW}>
            <Link
              href="/free-sample"
              className={`${CTA_PRIMARY} bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 text-white shadow-lg shadow-sky-500/25 hover:opacity-95`}
            >
              {t("dashboard.sampleSlideCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+19564003683"
              className={`${CTA_SECONDARY} border border-white/30 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm`}
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

        {/* Stretch rolls — desktop only */}
        <div className="pointer-events-none absolute bottom-0 right-6 lg:right-12 z-10 hidden md:block w-[200px] lg:w-[260px] xl:w-[300px]">
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
    <div className={`${SLIDE_SHELL} bg-slate-950`}>
      <SlideBackgroundImage src={AMERICAN_FLAG_BG} />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-700 via-white/80 to-red-700 z-20 pointer-events-none" />

      <div
        className={`relative z-10 grid h-full ${SLIDE_MIN_H} grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 items-center ${SLIDE_PAD}`}
      >
        <div className="flex flex-col items-start space-y-3 sm:space-y-4 min-w-0 relative z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-700/20 border border-red-500/50 px-3 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-red-100">
            <Flag className="w-3.5 h-3.5 text-red-400" />
            {t("dashboard.shippingSlideBadge")}
          </span>

          <h2 className={TITLE_CLASS}>{t("dashboard.shippingSlideTitle")}</h2>
          <p className={`${SUBTITLE_CLASS} text-slate-200`}>
            {t("dashboard.shippingSlideSubtitle")}
          </p>

          <div className={CTA_ROW}>
            <Link
              href="/#usa-coverage"
              className={`${CTA_PRIMARY} bg-white text-[#0a1628] shadow-lg shadow-black/20 hover:bg-slate-100 border border-red-600/30`}
            >
              <Truck className="w-4 h-4 text-red-600" />
              {t("dashboard.shippingSlideCta")}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="tel:+19564003683"
              className={`${CTA_SECONDARY} border border-white/25 bg-white/5 hover:bg-white/10 text-white`}
            >
              <PhoneCall className="w-4 h-4 text-sky-300" />
              (956) 400-3683
            </a>
          </div>
        </div>

        {/* USA map — desktop only */}
        <div
          className="hidden md:flex justify-end items-center min-h-[180px]"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="w-full max-w-[320px] xl:max-w-[420px] rounded-2xl border border-white/15 bg-[#0c1c36]/70 p-2 lg:p-3 shadow-xl shadow-black/30 backdrop-blur-sm [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[200px] xl:[&_svg]:max-h-[230px]">
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
  const [hoverHalf, setHoverHalf] = useState<
    "left" | "right" | "interactive" | null
  >(null);
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
      // Prefer swipe on coarse pointers; keep half-click for mouse
      if (window.matchMedia("(pointer: coarse)").matches) return;

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("button, a, input, textarea, select, label")
      ) {
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

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (info.offset.x <= -SWIPE_THRESHOLD) nextSlide();
      else if (info.offset.x >= SWIPE_THRESHOLD) prevSlide();
    },
    [nextSlide, prevSlide]
  );

  const slide = SLIDES[index];
  const cursorClass =
    hoverHalf === "interactive"
      ? "cursor-pointer"
      : hoverHalf === "left"
        ? "md:cursor-w-resize"
        : hoverHalf === "right"
          ? "md:cursor-e-resize"
          : "cursor-default";

  return (
    <section
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm select-none touch-pan-y ${cursorClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleContainerClick}
      aria-roledescription="carousel"
      aria-label={t("dashboard.promoCarouselLabel")}
    >
      <div className={`relative ${SLIDE_MIN_H}`}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative md:absolute md:inset-0"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragPropagation={false}
            onDragStart={() => setPaused(true)}
            onDragEnd={(event, info) => {
              setPaused(false);
              if (
                event.target instanceof Element &&
                event.target.closest("button, a, input, textarea, select, label")
              ) {
                return;
              }
              handleDragEnd(event, info);
            }}
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

      <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-5 z-20 flex items-center gap-1.5">
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
