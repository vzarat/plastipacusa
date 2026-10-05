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
import { useLanguage } from "@/context/LanguageContext";

const SLIDE_COUNT = 2;
const AUTO_MS = 6000;

const WAREHOUSE_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/warehouse_storage_background.png";
const LOGISTICS_BG =
  "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=2000&q=80";

const RGV_CITIES = [
  "McAllen",
  "Edinburg",
  "Pharr",
  "Mission",
  "Harlingen",
  "Brownsville",
  "Weslaco",
] as const;

const LOGISTICS = [
  { icon: Warehouse, label: "Direct Warehouse Dispatch" },
  { icon: Truck, label: "Dedicated Fleet Operations" },
  { icon: Building2, label: "Industrial Park Coverage" },
] as const;

const EASE = [0.16, 1, 0.3, 1] as const;

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
    hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 },
    show: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration, ease: EASE, delay: reduceMotion ? 0 : delay },
    }),
  };
  const fadeRight = {
    hidden: { opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : 16 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration, ease: EASE, delay: reduceMotion ? 0 : 0.12 },
    },
  };

  return (
    <section
      className="relative isolate overflow-hidden border-b border-slate-800 bg-slate-950 py-16 md:py-24"
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
      <div className="absolute inset-0 -z-10">
        <Image
          src={WAREHOUSE_BG}
          alt="Plastipac warehouse storage"
          fill
          priority
          fetchPriority="high"
          quality={75}
          sizes="100vw"
          className={`object-cover object-center transition-opacity duration-700 ease-out ${
            index === 0 ? "opacity-100" : "opacity-0"
          }`}
        />
        <Image
          src={LOGISTICS_BG}
          alt="Industrial delivery truck"
          fill
          quality={75}
          sizes="100vw"
          className={`object-cover object-center transition-opacity duration-700 ease-out ${
            index === 1 ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950" />
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {index === 0 ? (
            <motion.div
              key="hero-product"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
                <div className="space-y-6 text-center lg:col-span-7 lg:text-left">
                  <motion.div
                    variants={fadeUp}
                    custom={0}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/60 px-3.5 py-1.5 text-xs font-semibold text-blue-300 shadow-sm backdrop-blur-xs"
                  >
                    <Zap className="h-3.5 w-3.5 text-blue-400" />
                    <span>{t("hero.badge")}</span>
                  </motion.div>

                  <motion.h1
                    variants={fadeUp}
                    custom={0}
                    className="text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl"
                  >
                    {t("hero.titlePart1")} <br />
                    <span className="text-blue-400">{t("hero.titlePart2")}</span>
                  </motion.h1>

                  <motion.p
                    variants={fadeUp}
                    custom={0.12}
                    className="max-w-2xl text-base font-normal leading-relaxed text-slate-200 sm:text-lg"
                  >
                    {t("hero.description")}
                  </motion.p>

                  <motion.div
                    variants={fadeUp}
                    custom={0.2}
                    className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row lg:justify-start"
                  >
                    <Button
                      asChild
                      size="lg"
                      variant="gradient"
                      className="flex w-full items-center justify-center gap-2 shadow-lg shadow-sky-500/20 sm:w-auto"
                    >
                      <Link href="/products">
                        <span>{t("hero.exploreBtn")}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>

                    <Link
                      href="#inquiry-form"
                      className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-white/30 bg-white/5 px-6 font-medium text-white shadow-sm backdrop-blur-sm transition-all hover:bg-white/10 sm:w-auto"
                    >
                      <span className="font-medium text-white">{t("hero.quoteBtn")}</span>
                    </Link>
                  </motion.div>

                  <motion.div
                    variants={fadeUp}
                    custom={0.2}
                    className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-left sm:grid-cols-3"
                  >
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
                  </motion.div>
                </div>

                <motion.div variants={fadeRight} className="lg:col-span-5">
                  <div className="relative rounded-3xl border border-white/20 bg-white/95 p-7 shadow-2xl shadow-black/40 backdrop-blur-md">
                    <div className="absolute -top-3 right-6">
                      <Badge variant="gradient" className="px-3 py-1 font-bold shadow-md shadow-sky-500/20">
                        {t("hero.flagshipSeries")}
                      </Badge>
                    </div>

                    <div className="mb-5 flex items-center gap-3.5">
                      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-3 text-sky-600">
                        <Box className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="font-mono text-[11px] font-bold uppercase text-sky-600">
                          {t("hero.seriesName")}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">{t("hero.floatingCardTitle")}</h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-xs">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {t("hero.filmGauge")}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{t("hero.gaugeValue")}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {t("hero.width")}
                        </span>
                        <span className="text-sm font-bold text-slate-900">{t("hero.widthValue")}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {t("hero.application")}
                        </span>
                        <span className="text-sm font-bold text-sky-700">{t("hero.appValue")}</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                        <span className="block text-[10px] font-semibold uppercase text-slate-500">
                          {t("hero.startingAt")}
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">{t("hero.priceValue")}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
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
          ) : (
            <motion.div
              key="hero-delivery"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
            >
              <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
                <div className="space-y-6 text-center lg:col-span-7 lg:text-left">
                  <motion.div
                    variants={fadeUp}
                    custom={0}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/60 px-3.5 py-1.5 text-xs font-semibold text-blue-300 shadow-sm backdrop-blur-xs"
                  >
                    <Zap className="h-3.5 w-3.5 text-blue-400" />
                    <span>Direct Factory Supply</span>
                  </motion.div>

                  <motion.h2
                    variants={fadeUp}
                    custom={0}
                    className="text-4xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-6xl"
                  >
                    FREE LOCAL DELIVERY
                    <br />
                    <span className="text-blue-400">ACROSS THE RGV</span>
                  </motion.h2>

                  <motion.p
                    variants={fadeUp}
                    custom={0.12}
                    className="max-w-2xl text-base font-normal leading-relaxed text-slate-200 sm:text-lg"
                  >
                    $0 Freight Fee on Case & Pallet Orders direct from our regional facility.
                  </motion.p>

                  <motion.div
                    variants={fadeUp}
                    custom={0.16}
                    className="flex flex-wrap items-center justify-center gap-2 lg:justify-start"
                  >
                    {RGV_CITIES.map((city) => (
                      <span
                        key={city}
                        className="rounded-full border border-white/15 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-100"
                      >
                        {city}
                      </span>
                    ))}
                  </motion.div>

                  <motion.div
                    variants={fadeUp}
                    custom={0.2}
                    className="flex justify-center pt-2 lg:justify-start"
                  >
                    <Button
                      asChild
                      size="lg"
                      variant="gradient"
                      className="w-full shadow-lg shadow-sky-500/20 sm:w-auto"
                    >
                      <Link href="/#usa-coverage">
                        <span>Check Delivery Eligibility</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>

                <motion.div variants={fadeRight} className="lg:col-span-5">
                  <div className="rounded-3xl border border-white/15 bg-slate-950/55 p-7 shadow-2xl shadow-black/40 backdrop-blur-md">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-300">
                      RGV Logistics
                    </p>
                    <ul className="mt-5 space-y-3">
                      {LOGISTICS.map((item) => {
                        const Icon = item.icon;
                        return (
                          <li
                            key={item.label}
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-950/70 text-blue-300">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="text-sm font-semibold text-white">{item.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-2" aria-label="Hero slides">
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
