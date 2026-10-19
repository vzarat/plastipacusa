"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Package,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GradientWaves from "@/components/ui/GradientWaves";

const SLIDE_COUNT = 3;
const AUTO_MS = 6000;

const HOUSTON_HIGHLIGHTS = [
  "Guaranteed Friday Delivery Slots",
  "Applies to 256-Roll Full Pallet Tiers",
  "Direct Industrial Dock Unloading",
] as const;

const SLIDE_ONE_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_1%20(1).jpg";
const SLIDE_ONE_ROLLS =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/STRETCH_SLIDE_1.png";
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
    icon: Clock,
    title: "On-Time Deliveries",
    detail: "Routes planned to reach your dock on schedule.",
  },
  {
    icon: Building2,
    title: "Serving the Industrial Parks in the Rio Grande Valley",
    detail: "Local coverage across the Valley’s main industrial corridors.",
  },
  {
    icon: Package,
    title: "Minimum Purchase of 10 Boxes",
    detail: "Regional orders start at 10 boxes.",
  },
] as const;

export function Hero() {
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
    const onSlide = (event: Event) => {
      const detail = (event as CustomEvent<number>).detail;
      if (typeof detail !== "number") return;
      pausedRef.current = true;
      setIndex(((detail % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT);
    };
    const onRelease = () => {
      pausedRef.current = false;
    };
    window.addEventListener("plastipac:hero-slide", onSlide);
    window.addEventListener("plastipac:hero-slide-release", onRelease);
    return () => {
      window.removeEventListener("plastipac:hero-slide", onSlide);
      window.removeEventListener("plastipac:hero-slide-release", onRelease);
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
      className="bg-white px-4 py-4 sm:px-6 sm:py-6"
      aria-roledescription="carousel"
      aria-label="Featured"
      id="hero-carousel"
      data-tour="hero"
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
      <div className="relative mx-auto min-h-[560px] w-full max-w-[1400px] overflow-hidden rounded-[28px] bg-[#031433] md:rounded-[32px] lg:h-[640px] lg:min-h-0">
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            index === 0 ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        >
          <Image
            src={SLIDE_ONE_BG}
            alt=""
            fill
            priority
            sizes="(max-width: 1400px) 100vw, 1400px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/40 md:to-transparent" />
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

      <div className="relative z-10 lg:h-full">
        <AnimatePresence mode="wait">
          {index === 0 ? (
            <motion.div
              key="hero-product"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="relative flex min-h-[560px] items-end overflow-hidden lg:absolute lg:inset-0 lg:min-h-0 lg:items-center"
            >
              <div className="pointer-events-none absolute bottom-0 right-0 z-10 hidden h-[85%] w-[min(48%,560px)] md:block md:h-[95%]">
                <Image
                  src={SLIDE_ONE_ROLLS}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 48vw, 560px"
                  className="object-contain object-right object-bottom"
                />
              </div>
              <motion.div variants={fadeUp} className="relative z-20 flex w-full max-w-[820px] flex-col px-5 pb-14 pt-16 text-left sm:px-8 md:max-w-[58%] md:px-10 lg:px-12 lg:py-10">
                <div className="space-y-4">
                  <p className="inline-flex w-fit items-center rounded-full border border-blue-400/30 bg-blue-900/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                    Stretch Film Manufacturer
                  </p>
                  <h1 className="text-left font-teko text-5xl font-bold uppercase leading-none tracking-wide text-white sm:text-6xl md:text-7xl lg:text-8xl">
                    Order Bulk,
                    <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text font-bold text-transparent">
                      Save More
                    </span>
                    <span className="block">Wrap Better</span>
                  </h1>
                  <p className="max-w-[28rem] text-base font-medium leading-snug text-gray-100 sm:text-lg">
                    <strong className="font-bold text-white">FREE DELIVERY</strong> in the area of{" "}
                    <strong className="font-bold text-white">the RGV</strong> with purchases of 20 boxes or more.
                  </p>
                  <Link
                    href="/#product-catalog-section"
                    onClick={(event) => {
                      const target = document.getElementById("product-catalog-section");
                      if (!target) return;
                      event.preventDefault();
                      target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 hover:from-cyan-400 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    Shop Bulk Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          ) : index === 1 ? (
            <motion.div
              key="hero-delivery"
              id="rgv-shipping"
              data-tour="rgv-shipping"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="relative flex items-center overflow-hidden px-5 pb-14 pt-6 sm:px-8 md:px-10 lg:absolute lg:inset-0 lg:py-5 lg:px-12"
            >
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12 md:gap-6">
                <motion.div
                  variants={fadeUp}
                  className="space-y-2 text-left md:col-span-7"
                >
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/50 px-3 py-1 text-[11px] font-semibold leading-snug text-sky-200 shadow-sm">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                    <span>Direct Regional Distribution · From 16 Boxes Up</span>
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
                    $0 Freight Fee across the RGV starting from 16 Boxes (64 Rolls) up to 64 Boxes (256 Rolls).
                  </p>
                  <p className="inline-flex max-w-full items-center rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200">
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
                  <div className="hidden flex-wrap items-center justify-start gap-1.5 md:flex">
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
                    <ul className="space-y-1.5">
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
              id="houston-shipping"
              data-tour="houston-shipping"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, transition: { duration: reduceMotion ? 0 : 0.2 } }}
              className="relative flex items-center overflow-hidden px-5 pb-14 pt-6 sm:px-8 md:px-10 lg:absolute lg:inset-0 lg:py-5 lg:px-12"
            >
              <div className="relative z-20 mx-auto flex w-full max-w-7xl items-center md:h-full md:px-6 lg:px-8">
                <motion.div variants={fadeUp} className="w-full max-w-xl space-y-2 text-left">
                  <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/30 bg-slate-950/50 px-3 py-1 text-[11px] font-semibold leading-snug text-sky-200 shadow-sm">
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

                  <div className="flex justify-start">
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

        <div
          className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 backdrop-blur lg:bottom-5 lg:right-6"
          aria-label="Hero slides"
        >
          {Array.from({ length: SLIDE_COUNT }, (_, dot) => {
            const active = index === dot;
            return (
              <button
                key={dot}
                type="button"
                aria-label={`Go to slide ${dot + 1}`}
                aria-current={active ? "true" : undefined}
                onClick={() => goTo(dot)}
                className="flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <span
                  className={`rounded-full transition-all duration-300 ease-out ${
                    active ? "h-2 w-5 bg-sky-400" : "h-2 w-2 bg-white/55"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}

export const HeroBanner = Hero;
export default Hero;
