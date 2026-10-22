"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const SLIDE_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_1%20(1).jpg";
const SLIDE_ROLLS =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/STRETCH_SLIDE_1.png";
const EFFICIENCY_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_2.jpg";
const EFFICIENCY_MACHINE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/ROBOPACK.png";

const SLIDE_COUNT = 2;
const AUTO_MS = 7000;

const CTA_CLASS =
  "inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 hover:from-cyan-400 hover:to-blue-500";

function Headline({ className }: { className: string }) {
  return (
    <h1 className={className}>
      Order Bulk,
      <span className="block bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Save More
      </span>
      <span className="block">Wrap Better</span>
    </h1>
  );
}

function DeliveryLine({ className }: { className: string }) {
  return (
    <p className={className}>
      <strong className="font-bold text-white">FREE DELIVERY</strong> in the area of{" "}
      <strong className="font-bold text-white">the RGV</strong> with purchases of 20 boxes or more.
    </p>
  );
}

function BulkSlide() {
  return (
    <div className="absolute inset-0">
      <Image
        src={SLIDE_BG}
        alt=""
        fill
        priority
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/75 md:bg-gradient-to-r md:from-black/80 md:via-black/40 md:to-transparent" />

      <Image
        src={SLIDE_ROLLS}
        alt=""
        width={559}
        height={455}
        priority
        className="pointer-events-none absolute bottom-0 inset-x-0 z-10 mx-auto h-[52%] max-h-[52%] w-auto object-contain object-bottom md:inset-x-auto md:right-0 md:mx-0 md:h-[96%] md:max-h-[96%] md:max-w-[52%] lg:right-10 lg:h-auto lg:max-h-[88%] lg:max-w-[40%]"
      />

      <div className="relative z-20 flex h-full flex-col items-center px-5 pb-52 pt-8 text-center md:max-w-[56%] md:items-start md:justify-center md:px-12 md:pb-8 md:pt-8 md:text-left lg:max-w-[58%]">
        <p className="mb-3 hidden w-fit items-center rounded-full border border-blue-400/30 bg-blue-900/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white md:inline-flex">
          Stretch Film Manufacturer
        </p>
        <Headline className="font-teko text-5xl font-bold uppercase leading-[0.85] tracking-tight text-white md:whitespace-nowrap md:text-6xl lg:text-7xl" />
        <Link href="/#product-catalog-section" className={`${CTA_CLASS} mt-5 md:mt-4`}>
          Shop Bulk Now
          <ArrowRight className="h-4 w-4" />
        </Link>
        <DeliveryLine className="mt-4 max-w-sm text-sm font-medium leading-snug text-gray-100 md:mt-3 md:max-w-md md:text-base" />
      </div>
    </div>
  );
}

function EfficiencySlide() {
  return (
    <div className="absolute inset-0">
      <Image
        src={EFFICIENCY_BG}
        alt=""
        fill
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/75 md:bg-gradient-to-r md:from-black/75 md:via-black/35 md:to-transparent" />

      <Image
        src={EFFICIENCY_MACHINE}
        alt="Robopack stretch wrapping machine"
        width={900}
        height={900}
        className="pointer-events-none absolute z-10 w-auto object-contain object-bottom max-md:bottom-14 max-md:left-1/2 max-md:h-[46%] max-md:max-w-[96%] max-md:-translate-x-1/2 md:bottom-[25px] md:right-[180px] md:h-[90%] md:max-w-[42%]"
      />

      <div className="relative z-20 flex h-full max-w-full flex-col items-start justify-start px-8 pb-60 pt-8 text-left md:max-w-[58%] md:justify-center md:pb-8 md:pl-[110px] md:pr-4 md:pt-6">
        <h2 className="font-teko font-bold uppercase tracking-[-0.02em]">
          <span className="block text-[42px] leading-[0.85] text-white sm:text-[56px] md:text-[68px]">
            Increase Packaging
          </span>
          <span className="block bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-[54px] leading-[0.85] text-transparent sm:text-[72px] md:text-[88px]">
            Efficiency
          </span>
        </h2>
        <p className="mt-4 max-w-[440px] font-sans text-[15px] font-normal leading-snug text-gray-200">
          At <strong className="font-bold text-white">Plastipac USA</strong>, we&apos;re all about
          smarter packaging solutions to help your business work better!
        </p>
        <Link
          href="/#inquiry-form"
          className="mt-5 inline-flex w-fit items-center rounded-xl border border-sky-200/40 bg-gradient-to-r from-[#00b2e3] to-[#2563eb] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white md:rounded-[2px]"
        >
          Contact Us Today!
        </Link>
      </div>
    </div>
  );
}

export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDE_COUNT);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="bg-white px-4 py-4 sm:px-6 sm:py-6"
      aria-label="Featured"
      aria-roledescription="carousel"
      id="hero-carousel"
      data-tour="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative mx-auto h-[720px] min-h-[720px] w-full max-w-[1400px] overflow-hidden rounded-2xl md:h-[480px] md:min-h-0 md:rounded-3xl lg:h-[520px]">
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === 0 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== 0}
          inert={index !== 0}
        >
          <BulkSlide />
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === 1 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== 1}
          inert={index !== 1}
        >
          <EfficiencySlide />
        </div>

        <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
          {["Order bulk", "Increase packaging efficiency"].map((label, slide) => (
            <button
              key={label}
              type="button"
              aria-label={`Show slide: ${label}`}
              aria-current={index === slide ? "true" : undefined}
              onClick={() => setIndex(slide)}
              className={`h-2.5 rounded-full transition-all ${
                index === slide ? "w-7 bg-white" : "w-2.5 bg-white/55 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export const HeroBanner = Hero;
export default Hero;
