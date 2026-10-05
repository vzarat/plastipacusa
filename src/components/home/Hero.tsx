"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Box,
  Building2,
  CheckCircle2,
  ChevronRight,
  Truck,
  Warehouse,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GradientWaves from "@/components/ui/GradientWaves";
import { HoustonMap } from "@/components/ui/HoustonMap";
import { useLanguage } from "@/context/LanguageContext";

const SLIDE_COUNT = 3;

const HOUSTON_HIGHLIGHTS = [
  "Guaranteed Friday Delivery Slots",
  "Applies to 256-Roll Full Pallet Tiers",
  "Direct Industrial Dock Unloading",
] as const;
const AUTO_MS = 6000;

const WAREHOUSE_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/warehouse_storage_background.png";

const RGV_CITIES = [
  "McAllen",
  "Edinburg",
  "Pharr Bridge",
  "Mission",
  "Harlingen",
  "Brownsville Port",
  "Weslaco",
  "San Juan / Alamo",
] as const;

const LOGISTICS = [
  {
    icon: Truck,
    title: "Direct Plant-to-Dock Shipping",
    detail: "No cross-dock delays; straight from warehouse to your facility.",
  },
  {
    icon: Building2,
    title: "Industrial Park Coverage",
    detail:
      "Serving Sharyland, McAllen NW, Mid-Valley, & Valley International Trade parks.",
  },
  {
    icon: Warehouse,
    title: "Bulk Volume Freight Waiver",
    detail: "Free delivery unlocked on all 1-Layer (64 rolls) and Full Pallet orders.",
  },
] as const;

export function Hero() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const touchRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      setIndex((current) => (current + 1) % SLIDE_COUNT);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const goTo = (next: number) => {
    setIndex((next + SLIDE_COUNT) % SLIDE_COUNT);
  };

  const duration = reduceMotion ? 0 : 0.5;
  const fadeUp = {
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: "easeOut" as const },
    },
  };
  const fadeRight = {
    hidden: { opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : 32 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration, ease: "easeOut" as const, delay: reduceMotion ? 0 : 0.15 },
    },
  };

  return (
    <section
      className="relative isolate h-[520px] overflow-hidden border-b border-slate-800 bg-slate-950 lg:h-[520px]"
      aria-roledescription="carousel"
      aria-label="Featured"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onTouchStart={(event) => {
        pausedRef.current = true;
        const touch = event.changedTouches[0];
        touchRef.current = { x: touch?.clientX ?? 0, y: touch?.clientY ?? 0 };
      }}
      onTouchEnd={(event) => {
        const touch = event.changedTouches[0];
        const dx = (touch?.clientX ?? 0) - touchRef.current.x;
        const dy = (touch?.clientY ?? 0) - touchRef.current.y;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
          goTo(index + (dx < 0 ? 1 : -1));
        }
        window.setTimeout(() => {
          pausedRef.current = false;
        }, 4000);
      }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            index === 0 ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={WAREHOUSE_BG}
            alt="Plastipac warehouse storage"
            fill
            priority
            fetchPriority="high"
            quality={75}
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950" />
        </div>
        <div
          className={`absolute inset-0 z-0 transition-opacity duration-700 ease-out ${
            index === 1 ? "opacity-100" : "opacity-0"
          }`}
        >
          <GradientWaves
            horizonColor="#0b1329"
            waveColor="#0284c7"
            crestColor="#38bdf8"
            speed={0.35}
            amplitude={2.0}
            brightness={0.85}
            opacity={0.9}
            className="absolute inset-0 z-0"
          />
        </div>
        <div
          className={`absolute inset-0 bg-slate-950 transition-opacity duration-700 ease-out ${
            index === 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-slate-950/90" />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.18) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>
      </div>

      <div className="relative z-10 flex h-full items-center pb-8">
        <AnimatePresence mode="wait">
          {index === 0 ? (
            <motion.div
              key="hero-product"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
            >
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12 md:gap-6">
                <motion.div
                  variants={fadeUp}
                  className="space-y-2.5 text-center md:col-span-7 md:space-y-3 md:text-left"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/60 px-3 py-1 text-[11px] font-semibold text-blue-300 shadow-sm backdrop-blur-xs">
                    <Zap className="h-3.5 w-3.5 text-blue-400" />
                    <span>{t("hero.badge")}</span>
                  </div>

                  <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                    {t("hero.titlePart1")} <br />
                    <span className="text-blue-400">{t("hero.titlePart2")}</span>
                  </h1>

                  <p className="mx-auto line-clamp-2 max-w-2xl text-sm leading-snug text-slate-200 md:mx-0 md:line-clamp-3">
                    {t("hero.description")}
                  </p>

                  <div className="flex flex-row flex-wrap items-center justify-center gap-2 md:justify-start">
                    <Button
                      asChild
                      size="lg"
                      variant="gradient"
                      className="flex h-9 items-center justify-center gap-2 px-3 text-xs shadow-lg shadow-sky-500/20 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      <Link href="/products">
                        <span>{t("hero.exploreBtn")}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Link
                      href="#inquiry-form"
                      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-white/5 px-3 text-xs font-medium text-white shadow-sm backdrop-blur-sm transition-all hover:bg-white/10 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      <span className="font-medium text-white">{t("hero.quoteBtn")}</span>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2.5 text-left">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 p-1 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{t("hero.badgePreStretchTitle")}</div>
                        <div className="text-[11px] text-slate-300">{t("hero.badgePreStretchSub")}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 p-1 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{t("hero.badgePunctureTitle")}</div>
                        <div className="text-[11px] text-slate-300">{t("hero.badgePunctureSub")}</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 p-1 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{t("hero.badgeFactoryTitle")}</div>
                        <div className="text-[11px] text-slate-300">{t("hero.badgeFactorySub")}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={fadeRight} className="md:col-span-5">
                  <div className="relative rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-md lg:p-5">
                    <div className="absolute -top-3 right-6">
                      <Badge variant="gradient" className="px-3 py-1 font-bold shadow-md shadow-sky-500/20">
                        {t("hero.flagshipSeries")}
                      </Badge>
                    </div>

                    <div className="mb-3 flex items-center gap-3">
                      <div className="rounded-xl border border-sky-100 bg-sky-50 p-2 text-sky-600">
                        <Box className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-mono text-[10px] font-bold uppercase text-sky-600">
                          {t("hero.seriesName")}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 lg:text-base">{t("hero.floatingCardTitle")}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 border-y border-slate-100 py-2 text-[10px] md:grid-cols-2 md:gap-2 md:py-3 md:text-xs">
                      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {t("hero.filmGauge")}
                        </span>
                        <span className="text-xs font-bold text-slate-900 md:text-sm">{t("hero.gaugeValue")}</span>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {t("hero.width")}
                        </span>
                        <span className="text-xs font-bold text-slate-900 md:text-sm">{t("hero.widthValue")}</span>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {t("hero.application")}
                        </span>
                        <span className="text-xs font-bold text-sky-700 md:text-sm">{t("hero.appValue")}</span>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {t("hero.startingAt")}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 md:text-sm">{t("hero.priceValue")}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">{t("hero.readyToShip")}</span>
                      <Button asChild variant="gradient" size="sm" className="gap-1.5 shadow-sm">
                        <Link href="/products/stretch-film-18-x-60-ga-x-1000ft">
                          <span>{t("hero.viewMatrix")}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : index === 1 ? (
            <motion.div
              key="hero-delivery"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
            >
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12 md:gap-6">
                <motion.div
                  variants={fadeUp}
                  className="space-y-2 text-center md:col-span-7 md:space-y-2.5 md:text-left"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/50 px-3 py-1 text-[11px] font-semibold text-sky-200 shadow-sm">
                    <Zap className="h-3.5 w-3.5 text-sky-300" />
                    <span>Direct Regional Distribution · RGV Fleet</span>
                  </div>

                  <h2 className="text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl lg:text-3xl">
                    FREE LOCAL DELIVERY
                    <br />
                    <span className="text-sky-300">ACROSS THE RIO GRANDE VALLEY</span>
                  </h2>

                  <p className="mx-auto max-w-2xl text-xs leading-snug text-slate-100 sm:text-sm md:mx-0">
                    $0 Freight Charges for Case & Pallet Orders. Shipped directly from our local fulfillment hub with zero middleman markups.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-1.5 md:justify-start">
                    {RGV_CITIES.map((city) => (
                      <span
                        key={city}
                        className="rounded-full border border-white/20 bg-slate-950/55 px-2.5 py-0.5 text-[11px] font-semibold text-slate-100"
                      >
                        {city}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-row flex-wrap items-center justify-center gap-2 md:justify-start">
                    <Button
                      asChild
                      size="lg"
                      variant="gradient"
                      className="h-9 px-3 text-xs shadow-lg shadow-sky-500/20 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      <Link href="#inquiry-form">
                        <span>Schedule Local Delivery</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Link
                      href="/#usa-coverage"
                      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-white/10 px-3 text-xs font-medium text-white shadow-sm transition-all hover:bg-white/15 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      View Service Area Map
                    </Link>
                  </div>
                </motion.div>

                <motion.div variants={fadeRight} className="md:col-span-5">
                  <div className="rounded-2xl border border-white/20 bg-slate-950/45 p-3 shadow-2xl shadow-black/30 backdrop-blur-sm lg:p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-200">
                      Regional Fleet & Supply Highlights
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {LOGISTICS.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li
                            key={item.title}
                            className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5"
                          >
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-950/70 text-sky-200">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold text-white">{item.title}</span>
                              <span className="block text-[11px] leading-snug text-slate-200">{item.detail}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-[11px] font-semibold text-emerald-300">
                      ✓ Active Daily RGV Routes
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="hero-houston"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
            >
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12 md:gap-6">
                <motion.div
                  variants={fadeUp}
                  className="space-y-2 text-center md:col-span-7 md:space-y-2.5 md:text-left"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/50 px-3 py-1 text-[11px] font-semibold text-sky-200 shadow-sm">
                    <Zap className="h-3.5 w-3.5 text-sky-300" />
                    <span>Weekly Texas Freight Route</span>
                  </div>

                  <h2 className="text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl lg:text-3xl">
                    FREE HOUSTON DELIVERY
                    <br />
                    <span className="text-sky-300">EVERY FRIDAY</span>
                  </h2>

                  <p className="text-[11px] font-semibold text-amber-200">
                    ★ Exclusive to Full Pallet Orders (256 Rolls)
                  </p>

                  <p className="mx-auto max-w-2xl text-xs leading-snug text-slate-100 sm:text-sm md:mx-0">
                    We service the greater Houston Metro area every Friday. Order full pallets by Wednesday 5 PM to qualify for $0 shipping directly to your warehouse dock.
                  </p>

                  <ul className="space-y-1 text-left">
                    {HOUSTON_HIGHLIGHTS.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-100">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-center md:justify-start">
                    <Button
                      asChild
                      size="lg"
                      variant="gradient"
                      className="h-9 px-3 text-xs shadow-lg shadow-sky-500/20 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      <Link href="#inquiry-form">
                        <span>Reserve Friday Route Slot</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>

                <motion.div variants={fadeRight} className="md:col-span-5">
                  <div
                    className="relative h-[220px] overflow-hidden rounded-2xl border border-slate-800 shadow-2xl md:h-[380px]"
                    onTouchStart={(event) => event.stopPropagation()}
                    onTouchEnd={(event) => event.stopPropagation()}
                  >
                    <HoustonMap />
                    <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] rounded-full border border-white/15 bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold text-slate-100 shadow-lg">
                      🚚 Friday Route: Greater Houston Metro Area
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-3 left-0 right-0 z-20 flex items-center justify-center gap-2" aria-label="Hero slides">
          {Array.from({ length: SLIDE_COUNT }, (_, dot) => {
            const active = index === dot;
            return (
              <button
                key={dot}
                type="button"
                aria-label={`Show slide ${dot + 1}`}
                aria-current={active ? "true" : undefined}
                onClick={() => goTo(dot)}
                className="flex h-6 w-8 items-center justify-center"
              >
                <span
                  className={`h-2.5 rounded-full border transition-all duration-300 ease-out ${
                    active
                      ? "w-6 border-sky-400 bg-sky-400"
                      : "w-2.5 border-white/50 bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export const HeroBanner = Hero;
export default Hero;
