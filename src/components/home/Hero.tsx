import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const SLIDE_BG =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/SLIDE_1%20(1).jpg";
const SLIDE_ROLLS =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/SLIDES/STRETCH_SLIDE_1.png";
const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

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

export function Hero() {
  return (
    <section
      className="bg-white px-4 py-4 sm:px-6 sm:py-6"
      aria-label="Featured"
      id="hero-carousel"
      data-tour="hero"
    >
      <div className="relative mx-auto h-[580px] min-h-[580px] w-full max-w-[1400px] overflow-hidden rounded-2xl md:hidden">
        <Image
          src={SLIDE_BG}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/75" />

        <div className="relative z-10 flex h-full flex-col items-center px-5 pb-44 pt-8 text-center">
          <div className="rounded-xl bg-white/95 px-3 py-2 shadow-lg">
            <Image
              src={LOGO_SRC}
              alt="Plastipac USA — Expert manufacturer of stretch film"
              width={220}
              height={64}
              priority
              className="h-14 w-auto object-contain"
            />
          </div>
          <Headline className="mt-5 font-teko text-5xl font-bold uppercase leading-none tracking-wide text-white" />
          <Link
            href="/#inquiry-form"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-center text-sm font-bold uppercase tracking-wide text-white shadow-lg transition-colors hover:bg-blue-500"
          >
            Contact Us Today for a Quote
          </Link>
          <DeliveryLine className="mt-4 max-w-sm text-sm font-medium leading-snug text-gray-100" />
        </div>

        <Image
          src={SLIDE_ROLLS}
          alt=""
          width={559}
          height={455}
          className="pointer-events-none absolute bottom-0 inset-x-0 z-10 mx-auto h-[38%] max-h-[38%] w-auto object-contain object-bottom"
        />
        <div className="absolute inset-x-0 bottom-0 z-20 bg-black/80 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-white">
          <a href="https://www.plastipacusa.com" className="hover:text-sky-200">
            www.plastipacusa.com
          </a>
          <span className="px-2 text-white/50">|</span>
          <a href="tel:+19564003683" className="hover:text-sky-200">
            (956) 400 3683
          </a>
        </div>
      </div>

      <div className="relative mx-auto hidden h-[480px] w-full max-w-[1400px] overflow-hidden rounded-2xl md:block md:rounded-3xl lg:h-[520px]">
        <Image
          src={SLIDE_BG}
          alt=""
          fill
          priority
          sizes="(max-width: 1400px) 100vw, 1400px"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

        <Image
          src={SLIDE_ROLLS}
          alt=""
          width={559}
          height={455}
          className="pointer-events-none absolute bottom-0 z-10 w-auto object-contain object-bottom md:right-0 md:h-[96%] md:max-h-[96%] md:max-w-[52%] lg:right-10 lg:h-auto lg:max-h-[88%] lg:max-w-[40%]"
        />

        <div className="relative z-20 flex h-full max-w-[56%] flex-col justify-center px-6 py-8 text-left md:px-12 md:py-12 lg:max-w-[58%]">
          <p className="inline-flex w-fit items-center rounded-full border border-blue-400/30 bg-blue-900/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            Stretch Film Manufacturer
          </p>
          <Headline className="mt-3 whitespace-nowrap font-teko text-5xl font-bold uppercase leading-none tracking-wide text-white md:text-6xl lg:text-7xl" />
          <DeliveryLine className="mt-3 max-w-md text-sm font-medium leading-snug text-gray-100 md:text-base" />
          <Link
            href="/#product-catalog-section"
            className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 hover:from-cyan-400 hover:to-blue-500"
          >
            Shop Bulk Now
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export const HeroBanner = Hero;
export default Hero;
