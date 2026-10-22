"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const SLIDE_SDK_1 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_1.jpg";
const SLIDE_SDK_2 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_2.jpg";
const MOBIL_SLIDE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/MOBIL_SLIDE.jpg";
const EFFICIENCY_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_2.jpg";
const EFFICIENCY_MACHINE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/ROBOPACK.png";

const SLIDE_COUNT = 2;
const AUTO_MS = 7000;

const SLIDE_CTA_CLASS =
  "inline-flex w-fit items-center gap-[0.45cqw] rounded-[0.7cqw] bg-gradient-to-r from-cyan-500 to-blue-600 px-[1.15cqw] py-[0.55cqw] text-[1.05cqw] font-bold uppercase tracking-wide text-white shadow-md shadow-blue-500/30";

const MOBILE_CTA_CLASS =
  "inline-flex w-fit items-center gap-[1.8cqw] whitespace-nowrap rounded-[3.2cqw] bg-gradient-to-r from-cyan-500 to-blue-600 px-[5.6cqw] py-[2.8cqw] text-[3.9cqw] font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-500/30";

function BulkSlide() {
  return (
    <div className="absolute inset-0">
      <Image
        src={SLIDE_SDK_1}
        alt="Order bulk, save more, wrap better. Free delivery in the RGV with purchases of 20 boxes or more."
        fill
        priority
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="hidden object-contain object-center md:block"
      />
      <div className="absolute left-[9.84%] top-[77%] z-20 hidden md:block">
        <Link
          href="/#product-catalog-section"
          className={SLIDE_CTA_CLASS}
        >
          Shop Bulk Now
          <ArrowRight className="h-[1.05cqw] w-[1.05cqw]" />
        </Link>
      </div>

      <Image
        src={MOBIL_SLIDE}
        alt="Order bulk, save more, wrap better. Free delivery in the RGV with purchases of 20 boxes or more."
        fill
        priority
        sizes="100vw"
        className="object-contain object-center md:hidden"
      />
      <div className="absolute left-1/2 top-[41.5%] z-20 -translate-x-1/2 md:hidden">
        <Link href="/#product-catalog-section" className={MOBILE_CTA_CLASS}>
          Shop Bulk Now
          <ArrowRight className="h-[3.6cqw] w-[3.6cqw]" />
        </Link>
      </div>
    </div>
  );
}

function EfficiencySlide() {
  return (
    <div className="absolute inset-0">
      <Image
        src={SLIDE_SDK_2}
        alt="Increase packaging efficiency. At Plastipac USA, we're all about smarter packaging solutions to help your business work better."
        fill
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="hidden object-contain object-center md:block"
      />
      <div className="absolute left-[9.88%] top-[79.5%] z-20 hidden md:block">
        <Link href="/#inquiry-form" className={SLIDE_CTA_CLASS}>
          Contact Us Today!
          <ArrowRight className="h-[1.05cqw] w-[1.05cqw]" />
        </Link>
      </div>

      <div className="absolute inset-0 md:hidden">
        <Image
          src={EFFICIENCY_BG}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/75" />
        <Image
          src={EFFICIENCY_MACHINE}
          alt="Robopack stretch wrapping machine"
          width={900}
          height={900}
          className="pointer-events-none absolute bottom-14 left-1/2 z-10 h-[46%] max-w-[96%] -translate-x-1/2 object-contain object-bottom"
        />
        <div className="relative z-20 flex h-full max-w-full flex-col items-start justify-start px-8 pb-60 pt-8 text-left">
          <h2 className="font-teko font-bold uppercase tracking-[-0.02em]">
            <span className="block text-[42px] leading-[0.85] text-white sm:text-[56px]">
              Increase Packaging
            </span>
            <span className="block bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-[54px] leading-[0.85] text-transparent sm:text-[72px]">
              Efficiency
            </span>
          </h2>
          <p className="mt-4 max-w-[440px] font-sans text-[15px] font-normal leading-snug text-gray-200">
            At <strong className="font-bold text-white">Plastipac USA</strong>, we&apos;re all about
            smarter packaging solutions to help your business work better!
          </p>
          <Link
            href="/#inquiry-form"
            className="mt-5 inline-flex w-fit items-center rounded-xl border border-sky-200/40 bg-gradient-to-r from-[#00b2e3] to-[#2563eb] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white"
          >
            Contact Us Today!
          </Link>
        </div>
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
      <div className="relative mx-auto aspect-[1080/1920] h-auto w-full max-w-[1400px] overflow-hidden rounded-2xl [container-type:inline-size] md:aspect-[2560/800] md:rounded-3xl">
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

        <button
          type="button"
          aria-label="Previous slide"
          onClick={() =>
            setIndex((current) => (current - 1 + SLIDE_COUNT) % SLIDE_COUNT)
          }
          className="absolute inset-y-0 left-0 z-30 w-12 cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-white md:w-16"
        />
        <button
          type="button"
          aria-label="Next slide"
          onClick={() => setIndex((current) => (current + 1) % SLIDE_COUNT)}
          className="absolute inset-y-0 right-0 z-30 w-12 cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-white md:w-16"
        />

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
