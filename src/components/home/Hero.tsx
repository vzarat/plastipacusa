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
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GradientWaves from "@/components/ui/GradientWaves";
import { startGuidedTour } from "@/lib/onboarding-tour";

const SLIDE_COUNT = 3;
const AUTO_MS = 6000;

const HOUSTON_HIGHLIGHTS = [
  "Guaranteed Friday Delivery Slots",
  "Applies to 256-Roll Full Pallet Tiers",
  "Direct Industrial Dock Unloading",
] as const;

const FORCE_HAND_IMAGE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/Group%2088.png";
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
      <div className="relative mx-auto w-full max-w-[1400px] overflow-hidden rounded-[28px] bg-[#031433] md:rounded-[32px] lg:h-[440px]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            index === 0 ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        >
          <Image
            src={WAREHOUSE_BG}
            alt=""
            fill
            priority
            sizes="(max-width: 1400px) 100vw, 1400px"
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0 lg:hidden"
            style={{ background: "rgba(4,20,52,0.72)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(2,11,31,0.95) 0%, rgba(4,20,52,0.85) 35%, rgba(6,26,63,0.55) 65%, rgba(2,11,31,0.80) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 70% 50%, rgba(10,60,140,0.25) 0%, transparent 60%), linear-gradient(to top, rgba(2,11,31,0.72), transparent 42%), linear-gradient(to right, rgba(2,11,31,0.35), transparent 28%, transparent 78%, rgba(2,11,31,0.55))",
            }}
          />
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
              className="relative flex flex-col overflow-hidden pb-12 lg:absolute lg:inset-0 lg:block lg:pb-0"
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden w-[52%] backdrop-blur-[3px] lg:block" aria-hidden />
              <motion.div variants={fadeRight} className="pointer-events-none relative z-10 order-3 mt-2 h-[180px] shrink-0 lg:absolute lg:bottom-0 lg:right-0 lg:order-none lg:mt-0 lg:h-full lg:w-[58%]">
                <div className="absolute bottom-3 right-10 h-8 w-[68%] rounded-full bg-[#020B1F]/80 blur-2xl lg:bottom-6" aria-hidden />
                <Image
                  src={FORCE_HAND_IMAGE}
                  alt="FORCE™ Hand Stretch Film"
                  width={1400}
                  height={560}
                  priority
                  sizes="(max-width: 1024px) 80vw, 720px"
                  className="relative ml-auto h-[180px] w-auto max-w-[88%] object-contain object-right object-bottom drop-shadow-[0_18px_28px_rgba(2,11,31,0.55)] lg:absolute lg:bottom-0 lg:right-0 lg:h-[118%] lg:max-w-none lg:translate-x-6 lg:translate-y-5 lg:object-right"
                />
              </motion.div>
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
                }
                className="absolute right-6 top-16 z-20 hidden max-w-[240px] rounded-2xl border-[1.5px] border-sky-400/70 bg-white/10 px-4 py-3 text-left shadow-[0_8px_32px_rgba(2,11,31,0.35),0_0_24px_rgba(56,189,248,0.25),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl lg:block lg:top-8"
                style={{ WebkitBackdropFilter: "blur(24px)" }}
              >
                <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  Featured Product
                </p>
                <p className="text-xs font-bold tracking-tight text-white">
                  FORCE™ Hand Stretch Film
                </p>
                <p className="text-[10px] font-medium text-white/70">
                  1 Box (4 Rolls) · 18&quot; x 80 Ga x 1500 ft
                </p>
              </motion.div>
              <motion.div
                animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
                }
                className="absolute bottom-14 right-6 z-20 hidden max-w-[min(28rem,calc(100%-3rem))] rounded-2xl border-[1.5px] border-transparent bg-white/[0.12] px-4 py-3 shadow-[0_8px_32px_rgba(2,11,31,0.35),0_0_24px_rgba(56,189,248,0.25),inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-xl [background-clip:padding-box,border-box] [background-image:linear-gradient(rgba(255,255,255,0.12),rgba(255,255,255,0.12)),linear-gradient(90deg,rgba(56,189,248,0.85),rgba(37,99,235,0.9))] [background-origin:border-box] lg:block"
                style={{ WebkitBackdropFilter: "blur(24px)" }}
              >
                <ul className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                  {["300%+ Pre-Stretch Yield", "Extreme Puncture Hold", "Factory Direct Pricing"].map(
                    (label) => (
                      <li key={label} className="inline-flex items-center gap-1 text-[10px] font-semibold text-white">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                        {label}
                      </li>
                    )
                  )}
                </ul>
              </motion.div>
              <motion.div variants={fadeUp} className="relative z-20 order-1 flex w-full max-w-[620px] flex-col px-5 pb-2 pt-5 text-left sm:px-8 md:px-10 lg:h-full lg:w-[55%] lg:max-w-[620px] lg:justify-center lg:px-12 lg:py-5">
                  <div className="max-w-[560px] space-y-3">
                    <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden />
                      Serving the industry since 2008
                    </p>

                    <h1 className="max-w-[560px] text-left text-[1.65rem] font-extrabold uppercase leading-[1.15] tracking-tight text-white md:text-3xl">
                      Performance you can wrap around every load
                    </h1>

                    <p className="max-w-[460px] text-left text-sm font-normal leading-snug text-white/75">
                      From superior load containment and exceptional puncture resistance to optimized material usage, our films are designed to deliver consistent performance, greater efficiency, and dependable protection — load after load.
                    </p>

                    <div className="max-w-[560px] space-y-2 pt-1">
                      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <Link
                        href="/#product-catalog-section"
                        onClick={(event) => {
                          const target = document.getElementById("product-catalog-section");
                          if (!target) return;
                          event.preventDefault();
                          target.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="group inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-950 shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a3a9a]"
                      >
                        Explore catalog
                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </Link>
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="h-10 w-full rounded-full border-white/40 bg-transparent px-4 text-sm font-semibold text-white shadow-none hover:-translate-y-0.5 hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a3a9a] sm:w-auto"
                      >
                        <Link href="/#inquiry-form">
                          <span>Contact us</span>
                        </Link>
                      </Button>
                      </div>
                      <p className="max-w-[560px] text-sm text-sky-100/85">
                        Need help placing your first B2B order?{" "}
                        <button
                          type="button"
                          onClick={() => startGuidedTour()}
                          className="group inline-flex cursor-pointer items-center gap-1 font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a3a9a]"
                        >
                          Start Guided Tour
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </button>
                      </p>
                    </div>
                    <ul className="flex flex-col gap-1.5 pt-1 lg:hidden">
                      {["300%+ Pre-Stretch Yield", "Extreme Puncture Hold", "Factory Direct Pricing"].map(
                        (label) => (
                          <li key={label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            {label}
                          </li>
                        )
                      )}
                    </ul>
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
