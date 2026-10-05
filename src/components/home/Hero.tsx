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
import { useLanguage } from "@/context/LanguageContext";

const SLIDE_COUNT = 3;
const AUTO_MS = 6000;

const HOUSTON_HIGHLIGHTS = [
  "Guaranteed Friday Delivery Slots",
  "Applies to 256-Roll Full Pallet Tiers",
  "Direct Industrial Dock Unloading",
] as const;

const WAREHOUSE_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/warehouse_storage_background.png";
const HOUSTON_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/Gemini_Generated_Image_2q84y2q84y2q84y2-artguru.jpeg";

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

const RGV_MOBILE_CITIES = ["McAllen", "Pharr", "Brownsville", "Harlingen"] as const;

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
    detail: "Free delivery from 1 Layer (64 Rolls / 16 Boxes) through Full Pallet orders.",
  },
] as const;

export function Hero() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [houstonReady, setHoustonReady] = useState(false);
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);
  const touchRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setHoustonReady(true);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(reveal, { timeout: 1500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const id = window.setTimeout(reveal, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

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
      className="relative isolate flex h-[480px] min-h-[480px] flex-col overflow-hidden border-b border-slate-800 bg-slate-950 px-5 [contain:strict] md:block md:h-[520px] md:min-h-[520px] md:px-0"
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
            active={index === 1}
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
          className={`absolute inset-0 z-0 transition-opacity duration-700 ease-out ${
            index === 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          {houstonReady ? (
            <Image
              src={HOUSTON_BG}
              alt="Houston industrial logistics"
              fill
              loading="lazy"
              fetchPriority="low"
              sizes="100vw"
              className="h-full w-full object-cover object-center md:object-right"
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 z-10 w-full bg-gradient-to-b from-slate-950 via-slate-950/80 via-40% to-slate-950/25 md:bg-gradient-to-r md:from-slate-950 md:via-slate-950/90 md:via-50% md:to-transparent" />
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col md:block md:h-full md:pb-8">
        <div className="flex min-h-0 w-full flex-1 flex-col justify-center md:flex md:h-full md:items-center">
        <AnimatePresence mode="wait">
          {index === 0 ? (
            <motion.div
              key="hero-product"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="mx-auto w-full max-w-7xl md:px-6 lg:px-8"
            >
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12 md:gap-6">
                <motion.div
                  variants={fadeUp}
                  className="space-y-3 text-center md:col-span-7 md:space-y-3 md:text-left"
                >
                  <div className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/60 px-3 py-1 text-center text-[11px] font-semibold leading-snug text-blue-300 shadow-sm backdrop-blur-xs">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                    <span>{t("hero.badge")}</span>
                  </div>

                  <h1 className="text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white md:text-3xl md:font-extrabold lg:text-4xl">
                    {t("hero.titlePart1")} <br />
                    <span className="text-blue-400">{t("hero.titlePart2")}</span>
                  </h1>

                  <p className="mx-auto hidden max-w-2xl text-sm leading-snug text-slate-200 md:mx-0 md:block md:line-clamp-3">
                    {t("hero.description")}
                  </p>

                  <div className="flex flex-col items-stretch justify-center gap-2 md:flex-row md:flex-wrap md:items-center md:justify-start">
                    <Button
                      asChild
                      size="lg"
                      variant="gradient"
                      className="flex h-11 w-full items-center justify-center gap-2 px-3 text-sm shadow-lg shadow-sky-500/20 md:h-10 md:w-auto md:px-4"
                    >
                      <Link href="/products">
                        <span className="md:hidden">Explore Catalog</span>
                        <span className="hidden md:inline">{t("hero.exploreBtn")}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Link
                      href="#inquiry-form"
                      className="hidden h-10 cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-white/5 px-4 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition-all hover:bg-white/10 md:inline-flex"
                    >
                      <span className="font-medium text-white">{t("hero.quoteBtn")}</span>
                    </Link>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 md:hidden">
                    <span className="rounded-full border border-white/15 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-100">
                      300%+ Pre-Stretch
                    </span>
                    <span className="rounded-full border border-white/15 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-100">
                      Factory Direct
                    </span>
                  </div>

                  <div className="hidden grid-cols-3 gap-2 border-t border-white/10 pt-2.5 text-left md:grid">
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

                <motion.div variants={fadeRight} className="hidden md:col-span-5 md:block">
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
              className="mx-auto w-full max-w-7xl md:px-6 lg:px-8"
            >
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12 md:gap-6">
                <motion.div
                  variants={fadeUp}
                  className="space-y-3 text-center md:col-span-7 md:space-y-2.5 md:text-left"
                >
                  <div className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/50 px-3 py-1 text-center text-[11px] font-semibold leading-snug text-sky-200 shadow-sm">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                    <span>Direct Regional Distribution · From 1 Layer Up</span>
                  </div>

                  <h2 className="text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white md:text-3xl md:font-extrabold lg:text-4xl">
                    <span className="md:hidden">
                      FREE LOCAL DELIVERY
                      <br />
                      <span className="text-sky-300">ACROSS THE RGV</span>
                    </span>
                    <span className="hidden md:inline">
                      FREE LOCAL DELIVERY
                      <br />
                      <span className="text-sky-300">ACROSS THE RIO GRANDE VALLEY</span>
                    </span>
                  </h2>

                  <p className="mx-auto max-w-2xl text-sm leading-snug text-slate-100 md:mx-0">
                    $0 Freight Fee across the RGV starting from 1 Layer (64 Rolls / 16 Boxes) up to Full Pallet orders.
                  </p>
                  <p className="mx-auto inline-flex max-w-full items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 md:mx-0">
                    ✓ Free Local Delivery on 64+ Rolls
                  </p>

                  <div className="grid grid-cols-2 gap-2 md:hidden">
                    {RGV_MOBILE_CITIES.map((city) => (
                      <span
                        key={city}
                        className="rounded-xl border border-white/20 bg-slate-950/55 px-2.5 py-2 text-center text-xs font-semibold text-slate-100"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                  <div className="hidden flex-wrap items-center justify-center gap-1.5 md:flex md:justify-start">
                    {RGV_CITIES.map((city) => (
                      <span
                        key={city}
                        className="rounded-full border border-white/20 bg-slate-950/55 px-2.5 py-0.5 text-[11px] font-semibold text-slate-100"
                      >
                        {city}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col items-stretch gap-2 md:flex-row md:flex-wrap md:items-center md:justify-start">
                    <Button
                      asChild
                      size="lg"
                      variant="gradient"
                      className="h-11 w-full px-3 text-sm shadow-lg shadow-sky-500/20 md:hidden"
                    >
                      <Link href="/#usa-coverage">
                        <span>Check Delivery Eligibility</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="gradient"
                      className="hidden h-10 px-4 text-sm shadow-lg shadow-sky-500/20 md:inline-flex md:w-auto"
                    >
                      <Link href="#inquiry-form">
                        <span>Schedule Local Delivery</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Link
                      href="/#usa-coverage"
                      className="hidden h-10 cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-white/15 md:inline-flex"
                    >
                      View Service Area Map
                    </Link>
                  </div>
                </motion.div>

                <motion.div variants={fadeRight} className="hidden md:col-span-5 md:block">
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
              className="relative w-full md:h-full md:self-stretch"
            >
              <div className="relative z-20 mx-auto flex w-full max-w-7xl items-center md:h-full md:px-6 lg:px-8">
                <motion.div variants={fadeUp} className="w-full max-w-xl space-y-3 text-center md:space-y-2.5 md:text-left">
                  <div className="mx-auto inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/50 px-3 py-1 text-center text-[11px] font-semibold leading-snug text-sky-200 shadow-sm">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                    <span>Weekly Texas Freight Route</span>
                  </div>

                  <h2 className="text-[1.65rem] font-bold leading-[1.15] tracking-tight text-white md:text-3xl md:font-extrabold lg:text-4xl">
                    FREE HOUSTON DELIVERY
                    <br />
                    <span className="text-sky-300">EVERY FRIDAY</span>
                  </h2>

                  <p className="text-xs font-semibold text-amber-200">
                    ★ Exclusive to Full Pallet Orders (256 Rolls / 4 Layers)
                  </p>

                  <p className="mx-auto max-w-xl text-sm leading-snug text-slate-100 md:mx-0">
                    <span className="md:hidden">Weekly Friday freight route to Houston industrial docks.</span>
                    <span className="hidden md:inline">
                      We service the greater Houston Metro area every Friday. Order full pallets by Wednesday 5 PM to qualify for $0 shipping directly to your facility dock.
                    </span>
                  </p>

                  <ul className="hidden space-y-1 text-left md:flex md:flex-col">
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
                      className="h-11 w-full px-3 text-sm shadow-lg shadow-sky-500/20 md:h-10 md:w-auto md:px-4"
                    >
                      <Link href="#inquiry-form">
                        <span className="md:hidden">Reserve Friday Route</span>
                        <span className="hidden md:inline">Reserve Friday Route Slot</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              </div>

              <div className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-end p-8 pb-12 md:flex">
                <motion.div
                  variants={fadeRight}
                  className="max-w-xs rounded-2xl border border-white/15 bg-slate-950/45 px-4 py-3 text-left shadow-2xl shadow-black/30 backdrop-blur-md"
                >
                  <p className="text-xs font-semibold text-white">🚚 Houston Metro Area · Weekly Corridor</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-200">
                    Serving Pasadena, Baytown, Sugar Land & Industrial Hubs
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        <div className="mt-5 flex shrink-0 items-center justify-center gap-2 md:absolute md:bottom-3 md:left-0 md:right-0 md:z-20 md:mt-0" aria-label="Hero slides">
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
