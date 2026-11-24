"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent as ReactTouchEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const SLIDE_BACKGROUND_VIDEO =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/BACKGROUND%202.mp4";
/** Mobile-only first slide video. */
const SLIDE_MOBILE_VIDEO =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/1124.mp4";
const SLIDE_MOBILE_STORY =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/Instagram%20story%20-%208.png";
const SLIDE_SDK_4 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_4.jpg";
const SLIDE_SDK_5 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_5.jpg";
const SLIDE_SDK_2 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_2.jpg";
const SLIDE_SDK_3 =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_SDK_3.jpg";
const MOBILE_SLIDE_COUNT = 2;
const DESKTOP_SLIDE_COUNT = 5;
/** Desktop + mobile story slide dwell. Video advances on `ended`. */
const AUTO_MS = 5000;
const SWIPE_PX = 40;
const SLIDE_LABELS = [
  "Featured video",
  "Packaging solutions",
  "High-performance at competitive prices",
  "Increase packaging efficiency",
  "Quality you can count on",
];

const SLIDE_CTA_CLASS =
  "inline-flex w-fit items-center gap-[0.45cqw] rounded-[0.7cqw] bg-gradient-to-r from-cyan-500 to-blue-600 px-[1.15cqw] py-[0.55cqw] text-[1.05cqw] font-bold uppercase tracking-wide text-white shadow-md shadow-blue-500/30";

const MOBILE_CTA_CLASS =
  "inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-[#00b2e3] to-[#2563eb] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-blue-500/30";

function useAutoplayVideo(active: boolean, opts?: { onEnded?: () => void; loop?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onEnded = opts?.onEnded;
  const loop = opts?.loop ?? true;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = loop;
    if (active) {
      video.currentTime = 0;
      const play = () => {
        video.play().catch(() => {
          // Autoplay can be blocked; muted + playsInline usually allows it.
        });
      };
      if (video.readyState >= 2) play();
      else video.addEventListener("loadeddata", play, { once: true });
    } else {
      video.pause();
    }
  }, [active, loop]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onEnded) return;
    const handleEnded = () => onEnded();
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [onEnded]);

  return videoRef;
}

/** Mobile-only first slide: 1124.mp4 — advances after one full play. */
function MobileVideoSlide({
  active,
  onEnded,
}: {
  active: boolean;
  onEnded: () => void;
}) {
  const videoRef = useAutoplayVideo(active, { onEnded, loop: false });

  return (
    <div className="absolute inset-0 bg-slate-950 md:hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-center"
        src={SLIDE_MOBILE_VIDEO}
        muted
        playsInline
        autoPlay
        preload="auto"
        aria-label="Plastipac USA stretch film — mobile featured video"
      />
    </div>
  );
}

/** Mobile second slide: Instagram story + Shop Now. */
function MobileStorySlide() {
  return (
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
  );
}

/** Desktop first slide: BACKGROUND 2 — one full play, then next slide. */
function DesktopVideoSlide({
  active,
  onEnded,
}: {
  active: boolean;
  onEnded: () => void;
}) {
  const videoRef = useAutoplayVideo(active, { onEnded, loop: false });

  return (
    <div className="absolute inset-0 hidden bg-slate-950 md:block">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-center"
        src={SLIDE_BACKGROUND_VIDEO}
        muted
        playsInline
        autoPlay
        preload="auto"
        aria-label="Plastipac USA stretch film — featured packaging video"
      />
    </div>
  );
}

function FeaturedImageSlide() {
  return (
    <div className="absolute inset-0">
      <Image
        src={SLIDE_SDK_4}
        alt="Plastipac USA stretch film — featured packaging solutions"
        fill
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="hidden object-contain object-center md:block"
      />
      <div className="absolute left-[8.1%] top-[64.5%] z-20 hidden md:block">
        <Link href="/#product-catalog-section" className={SLIDE_CTA_CLASS}>
          Shop Now
          <ArrowRight className="h-[1.05cqw] w-[1.05cqw]" />
        </Link>
      </div>
    </div>
  );
}

function PerformanceSlide() {
  return (
    <div className="absolute inset-0">
      <Image
        src={SLIDE_SDK_5}
        alt="High-performance stretch film at competitive prices."
        fill
        sizes="(max-width: 1400px) 100vw, 1400px"
        className="hidden object-contain object-center md:block"
      />
      <div className="absolute left-1/2 top-[68%] z-20 hidden -translate-x-1/2 md:block">
        <Link href="/#product-catalog-section" className={SLIDE_CTA_CLASS}>
          Shop Now
          <ArrowRight className="h-[1.05cqw] w-[1.05cqw]" />
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
  const [isDesktop, setIsDesktop] = useState(false);
  const [slideCount, setSlideCount] = useState(MOBILE_SLIDE_COUNT);
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % slideCount);
  }, [slideCount]);

  const goPrev = useCallback(() => {
    setIndex((current) => (current - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      const desktop = media.matches;
      const nextCount = desktop ? DESKTOP_SLIDE_COUNT : MOBILE_SLIDE_COUNT;
      setIsDesktop(desktop);
      setSlideCount(nextCount);
      setIndex((current) => (current >= nextCount ? 0 : current));
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  // Prefetch the active hero video for faster start.
  useEffect(() => {
    const href = isDesktop ? SLIDE_BACKGROUND_VIDEO : SLIDE_MOBILE_VIDEO;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = href;
    link.type = "video/mp4";
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [isDesktop]);

  // Auto-advance: on video slide (mobile or desktop), wait for `ended`.
  // Other slides use the timer. When the carousel returns to slide 0, video plays again.
  useEffect(() => {
    if (paused || slideCount <= 1) return;
    if (index === 0) return;
    const timer = window.setInterval(goNext, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [paused, slideCount, index, goNext]);

  function onTouchStart(event: ReactTouchEvent) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: ReactTouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = event.changedTouches[0]?.clientX;
    if (end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < SWIPE_PX) return;
    if (delta < 0) goNext();
    else goPrev();
  }

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
      {/* Mobile vertical video 1080×1920. Desktop banner 2560×800. */}
      <div
        className="relative mx-auto aspect-[1080/1920] w-full max-w-[1400px] touch-pan-y overflow-hidden rounded-2xl [container-type:inline-size] md:aspect-[2560/800] md:rounded-3xl"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            index === 0 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== 0}
          inert={index !== 0}
        >
          <MobileVideoSlide active={index === 0 && !isDesktop} onEnded={goNext} />
          <DesktopVideoSlide active={index === 0 && isDesktop} onEnded={goNext} />
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            index === 1 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== 1}
          inert={index !== 1}
        >
          <MobileStorySlide />
          <FeaturedImageSlide />
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            index === 2 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== 2}
          inert={index !== 2}
        >
          <PerformanceSlide />
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            index === 3 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== 3}
          inert={index !== 3}
        >
          <EfficiencySlide />
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            index === 4 ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={index !== 4}
          inert={index !== 4}
        >
          <QualitySlide />
        </div>

        {slideCount > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={goPrev}
              className="absolute inset-y-0 left-0 z-30 w-12 cursor-pointer bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-8px] focus-visible:outline-white md:w-16"
            />
            <button
              type="button"
              aria-label="Next slide"
              onClick={goNext}
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
