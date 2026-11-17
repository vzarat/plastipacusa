"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const SLIDE_SDK_4 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_4.jpg";
const SLIDE_SDK_2 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_2.jpg";
const SLIDE_SDK_3 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_3.jpg";
const SLIDE_MOBILE_STORY =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/Instagram%20story%20-%208.png";

const MOBILE_SLIDE_COUNT = 1;
const DESKTOP_SLIDE_COUNT = 3;
const AUTO_MS = 7000;
const SLIDE_LABELS = [
  "Featured",
  "Increase packaging efficiency",
  "Quality you can count on",
];

const SLIDE_CTA_CLASS =
  "inline-flex w-fit items-center gap-[0.45cqw] rounded-[0.7cqw] bg-gradient-to-r from-cyan-500 to-blue-600 px-[1.15cqw] py-[0.55cqw] text-[1.05cqw] font-bold uppercase tracking-wide text-white shadow-md shadow-blue-500/30";

const MOBILE_CTA_CLASS =
  "inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-[#00b2e3] to-[#2563eb] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-blue-500/30";

/** First slide: SDK_4 on desktop, Instagram story art on mobile. */
function LeadSlide() {
  return (
    <div className="absolute inset-0">
      <Image
        src={SLIDE_SDK_4}
        alt="Plastipac USA stretch film — featured packaging solutions"
        fill
        priority
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="hidden object-contain object-center md:block"
      />
      <div className="absolute left-[8.1%] top-[64.5%] z-20 hidden md:block">
        <Link href="/#product-catalog-section" className={SLIDE_CTA_CLASS}>
          Shop Now
          <ArrowRight className="h-[1.05cqw] w-[1.05cqw]" />
        </Link>
      </div>

      <div className="absolute inset-0 md:hidden">
        <Image
          src={SLIDE_MOBILE_STORY}
          alt="We are the manufacturers. We manufacture high-quality stretch film designed to meet your packaging needs."
          fill
          priority
          sizes="100vw"
          className="object-contain object-center"
        />
        <div className="absolute left-1/2 top-[41.5%] z-20 -translate-x-1/2">
          <Link href="/#product-catalog-section" className={MOBILE_CTA_CLASS}>
            Shop Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
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
    </div>
  );
}

function QualitySlide() {
  return (
    <div className="absolute inset-0">
      <Image
        src={SLIDE_SDK_3}
        alt="Quality you can count on in every shipment. Our stretch film protects and holds every load."
        fill
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="hidden object-contain object-center md:block"
      />
      <div className="absolute left-[9.88%] top-[68.5%] z-20 hidden md:block">
        <Link href="/#product-catalog-section" className={SLIDE_CTA_CLASS}>
          Shop Now
          <ArrowRight className="h-[1.05cqw] w-[1.05cqw]" />
        </Link>
      </div>
    </div>
  );
}

export function Hero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slideCount, setSlideCount] = useState(MOBILE_SLIDE_COUNT);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      const nextCount = media.matches ? DESKTOP_SLIDE_COUNT : MOBILE_SLIDE_COUNT;
      setSlideCount(nextCount);
      setIndex((current) => (current >= nextCount ? 0 : current));
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (paused || slideCount <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [paused, slideCount]);

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
          <LeadSlide />
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
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === 2 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== 2}
          inert={index !== 2}
        >
          <QualitySlide />
        </div>

        {slideCount > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() =>
                setIndex((current) => (current - 1 + slideCount) % slideCount)
              }
              className="absolute inset-y-0 left-0 z-30 w-12 cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-white md:w-16"
            />
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setIndex((current) => (current + 1) % slideCount)}
              className="absolute inset-y-0 right-0 z-30 w-12 cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-white md:w-16"
            />

            <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2">
              {SLIDE_LABELS.slice(0, slideCount).map((label, slide) => (
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
          </>
        ) : null}
      </div>
    </section>
  );
}

export const HeroBanner = Hero;
export default Hero;
