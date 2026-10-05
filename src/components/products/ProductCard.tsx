"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import Image from "next/image";
import { ProductWithVariants } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowRight, CheckCircle2, Box, Layers } from "lucide-react";
import {
  GENESIS_HP_SLUGS,
  SERIES_GENESIS_HP,
  SERIES_GENESIS_STANDARD,
  STRETCH_FILM_PLACEHOLDER,
} from "@/lib/products";
interface ProductCardProps {
  product: ProductWithVariants;
  priority?: boolean;
}

const DEFAULT_PRODUCT_IMAGE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png";

const CATEGORY_LOGOS: Record<string, { src: string; alt: string }> = {
  "force-standard": {
    src: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_ST.svg",
    alt: "FORCE Standard",
  },
  "force-elite": {
    src: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_EL.svg",
    alt: "FORCE Elite",
  },
  "genesis-standard": {
    src: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/GENESIS_ST.svg",
    alt: "GENESIS Standard",
  },
  "genesis-high-performance": {
    src: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/GENESIS_HP.svg",
    alt: "GENESIS High Performance",
  },
};

const CATEGORY_STYLES: Record<
  string,
  {
    seriesColor: string;
    hoverTitleColor: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    iconColor: string;
  }
> = {
  "force-standard": {
    seriesColor: "text-sky-600",
    hoverTitleColor: "group-hover:text-sky-600",
    badgeBg: "bg-sky-50/80",
    badgeBorder: "border-sky-100",
    badgeText: "text-sky-800",
    iconColor: "text-sky-600",
  },
  "force-elite": {
    seriesColor: "text-amber-600",
    hoverTitleColor: "group-hover:text-amber-600",
    badgeBg: "bg-amber-50/80",
    badgeBorder: "border-amber-100",
    badgeText: "text-amber-800",
    iconColor: "text-amber-600",
  },
  "genesis-standard": {
    seriesColor: "text-red-600",
    hoverTitleColor: "group-hover:text-red-600",
    badgeBg: "bg-red-50/80",
    badgeBorder: "border-red-100",
    badgeText: "text-red-800",
    iconColor: "text-red-600",
  },
  "genesis-high-performance": {
    seriesColor: "text-emerald-600",
    hoverTitleColor: "group-hover:text-emerald-600",
    badgeBg: "bg-emerald-50/80",
    badgeBorder: "border-emerald-100",
    badgeText: "text-emerald-800",
    iconColor: "text-emerald-600",
  },
};

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = React.useState(false);
  // Resolve category brand logo and machine film detection
  const rawWidth = (product as any)?.width_inches ?? (product as any)?.widthInches ?? 0;
  const width = typeof rawWidth === "number" ? rawWidth : parseFloat(String(rawWidth)) || 0;
  const categorySlug = String(product?.categorySlug || "").toLowerCase();
  const catId = String(product?.categoryId || (product as any)?.category_id || "");
  const pSlug = String(product?.slug || "").toLowerCase();
  const pBrand = String(product?.brand || "").toLowerCase();
  const pTitle = String(product?.title || product?.name || "").toLowerCase();

  // Exact series field first — never partial GENESIS matching
  const isGenesisHp =
    product.series === SERIES_GENESIS_HP ||
    (product.series !== SERIES_GENESIS_STANDARD && GENESIS_HP_SLUGS.has(pSlug));
  const isGenesis =
    isGenesisHp ||
    product.series === SERIES_GENESIS_STANDARD ||
    width === 20 ||
    categorySlug === "genesis-standard" ||
    categorySlug === "genesis-high-performance" ||
    categorySlug === "machine-high-yield-film" ||
    catId === "b0000000-0000-0000-0000-000000000003" ||
    catId === "genesis-high-performance" ||
    pSlug.includes("20-x") ||
    pTitle.includes('20"') ||
    pBrand.includes("genesis") ||
    product?.application === "machine";

  const isGenesisHighPerformance = isGenesisHp;

  // 15" -> FORCE Elite (amber badge)
  const isElite =
    !isGenesis &&
    (width === 15 ||
      categorySlug === "force-elite" ||
      pSlug.includes("15-x") ||
      pTitle.includes('15"') ||
      pSlug.includes("elite") ||
      pTitle.includes("elite") ||
      catId === "b0000000-0000-0000-0000-000000000002");

  // 18" -> FORCE Standard (blue badge)
  const resolvedCategorySlug = isGenesis
    ? isGenesisHighPerformance
      ? "genesis-high-performance"
      : "genesis-standard"
    : isElite
    ? "force-elite"
    : "force-standard";

  const categoryLogo =
    CATEGORY_LOGOS[resolvedCategorySlug] || CATEGORY_LOGOS["force-standard"];
  const catStyles =
    CATEGORY_STYLES[resolvedCategorySlug] || CATEGORY_STYLES["force-standard"];

  // Find minimum starting price among variants / package options / product base
  const variantPrices = (product?.variants || [])
    .map((v) => parseFloat(String(v.priceUsd)))
    .filter((p) => Number.isFinite(p) && p > 0);

  const packagePrices = (product?.packageOptions || [])
    .map((opt) => Number(opt.price))
    .filter((p) => Number.isFinite(p) && p > 0);

  const startingPrice = Number((product as any)?.startingPrice);
  const basePrice = Number((product as any)?.priceUsd);

  const priceCandidates = [
    ...variantPrices,
    ...packagePrices,
    ...(Number.isFinite(startingPrice) && startingPrice > 0 ? [startingPrice] : []),
    ...(Number.isFinite(basePrice) && basePrice > 0 ? [basePrice] : []),
  ];

  const primaryPrice = priceCandidates.length > 0 ? Math.min(...priceCandidates) : null;
  const primaryVariant = product?.variants?.[0];
  const cheapestPackage = [...(product?.packageOptions || [])].sort(
    (a, b) => a.price - b.price
  )[0];

  const AUTOMATIC_IMAGE =
    "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png";

  const rawImage =
    (product?.images && product.images[0]) || product?.imageUrl;

  const primaryImage = imageFailed
    ? STRETCH_FILM_PLACEHOLDER
    : isGenesis && (!rawImage || rawImage.includes("manual"))
      ? AUTOMATIC_IMAGE
      : rawImage || STRETCH_FILM_PLACEHOLDER;

  const secondaryImage =
    product?.images && product.images.length > 1
      ? product.images[1]
      : null;

  const title =
    product.storefrontTitle ||
    product.title ||
    product.name ||
    (isGenesis
      ? 'STRETCH FILM 20" MACHINE WRAP'
      : isElite
      ? 'FORCE ELITE™ 15" Hand Stretch Film'
      : 'FORCE™ 18" Hand Stretch Film');

  // Build the volume tier pill from whichever tier prices the admin has configured
  const availableTiers: string[] = [];
  if (product.priceCase !== null && product.priceCase !== undefined) {
    availableTiers.push(isGenesis ? "Rolls" : "Boxes");
  }
  if (product.priceHalfPallet !== null && product.priceHalfPallet !== undefined) {
    availableTiers.push("Half Pallet");
  }
  if (product.pricePallet !== null && product.pricePallet !== undefined) {
    availableTiers.push("Pallet");
  }
  const isSoldOut = Boolean(product.isSoldOut);

  const volumeTierLabel =
    availableTiers.length > 0
      ? `Volume tiers: ${availableTiers.join(" & ")}`
      : isGenesis
      ? "Volume tiers: Rolls & Pallets"
      : "Volume tiers: Boxes & Pallets";

  return (
    <div className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white transition-all duration-300 hover:border-sky-300 md:rounded-3xl md:hover:-translate-y-1 md:hover:shadow-xl md:hover:shadow-sky-500/10 card-hover-effect">
      <div>
        {/* 1. Clean Product Image Area (Completely free of floating dark pills and text overlays) */}
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden border-b border-slate-100 bg-slate-50/50 md:aspect-[4/3]">
          {/* Official Category Brand Logo Badge */}
          {isSoldOut && (
            <div className="absolute top-3.5 right-3.5 z-10 rounded-full border border-rose-200 bg-rose-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
              {t("products.soldOut")}
            </div>
          )}

          <div className="absolute top-3.5 left-3.5 z-10 hidden items-center justify-center rounded-lg border border-slate-200/60 bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-md md:flex">
            <Image
              src={categoryLogo.src}
              alt={categoryLogo.alt}
              width={90}
              height={28}
              className="h-6 md:h-7 w-auto object-contain pointer-events-none"
            />
          </div>

          {/* Primary Product Image (Rolls) */}
          <Image
            src={primaryImage}
            alt={title}
            fill
            priority={priority}
            placeholder="empty"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-contain p-2 transition-all duration-300 md:p-5 ${
              secondaryImage
                ? "group-hover:opacity-0 group-hover:scale-95"
                : "group-hover:scale-105"
            }`}
            onError={() => setImageFailed(true)}
          />

          {/* Secondary Product Image (Box Packaging on Hover) */}
          {secondaryImage && (
            <Image
              src={secondaryImage}
              alt={`${title} Packaging Box`}
              fill
              placeholder="empty"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="pointer-events-none object-contain p-2 opacity-0 transition-all duration-300 group-hover:scale-105 group-hover:opacity-100 md:p-5"
            />
          )}
        </div>

        {/* 2. Refined Product Info & B2B Volume Indicator */}
        <div className="space-y-3.5 p-3 pb-2 md:p-6 md:pb-4">
          <div>
            <span className={`hidden text-[10px] font-mono font-bold uppercase tracking-wider md:block ${catStyles.seriesColor}`}>
              {isGenesis
                ? isGenesisHighPerformance
                  ? "GENESIS • Automatic High Performance"
                  : "GENESIS • Machine Cast Series"
                : isElite
                ? "FORCE ELITE • Nano Multi-Layer Series"
                : "FORCE • Industrial Cast Series"}
            </span>
            <h3 className={`mt-0 line-clamp-2 text-xs font-extrabold leading-snug text-slate-900 transition-colors md:mt-1 md:min-h-[3rem] md:text-base ${catStyles.hoverTitleColor}`}>
              <Link href={`/products/${product?.slug || "stretch-film-18-x-60-ga-x-1000ft"}`}>
                {title}
              </Link>
            </h3>
            <p className="mt-1.5 hidden text-xs leading-relaxed text-slate-500 line-clamp-2 md:block">
              {product?.shortDescription ||
                (isGenesis
                  ? "High-yield automated cast stretch film engineered for high-speed turntable and rotary wrapper systems."
                  : "Premium industrial cast hand wrap engineered for high load retention and quiet unwind.")}
            </p>
          </div>

          {/* B2B Volume Availability & Feature Badges */}
          <div className="hidden space-y-2.5 pt-1 md:block">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${catStyles.badgeBg} border ${catStyles.badgeBorder} ${catStyles.badgeText} text-[11px] font-semibold`}>
              <Layers className={`w-3.5 h-3.5 ${catStyles.iconColor}`} />
              <span>{volumeTierLabel}</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${catStyles.iconColor} flex-shrink-0`} />
                <span>{isGenesis ? "Power Pre-Stretch" : "Multi-Layer Cast"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 ${catStyles.iconColor} flex-shrink-0`} />
                <span>{isSoldOut ? t("products.soldOut") : t("products.readyToShip")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pricing Display & Full-Width High-Conversion CTA Button */}
      <div className="space-y-2 p-3 pt-0 md:space-y-3.5 md:p-6">
        <div className="flex items-baseline justify-between border-t border-slate-100 pt-2 md:pt-3">
          <div>
            <span className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-400 md:block">
              {t("products.startingAt")}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black tracking-tight text-slate-900 md:text-2xl">
                {primaryPrice !== null ? formatCurrency(primaryPrice) : "—"}
              </span>
              {primaryPrice !== null && (
                <span className="hidden text-xs font-bold text-slate-500 md:inline">USD</span>
              )}
            </div>
          </div>
          <span className="hidden rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 md:inline">
            {isGenesis
              ? "Machine Roll"
              : cheapestPackage?.rolls
              ? `${cheapestPackage.rolls} Rolls`
              : primaryVariant?.rollsPerBox
              ? `${primaryVariant.rollsPerBox} Rolls / Box`
              : "Package"}
          </span>
        </div>

        {/* High-Conversion "BUY NOW" Button */}
        {isSoldOut ? (
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-xs font-extrabold text-slate-500 md:px-4 md:py-3 md:text-sm"
          >
            {t("products.soldOut")}
          </button>
        ) : (
          <Link
            href={`/products/${product?.slug || "stretch-film-18-x-60-ga-x-1000ft"}`}
            className="group/btn flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white transition-transform active:scale-95 md:gap-2 md:bg-gradient-to-r md:from-sky-500 md:via-sky-600 md:to-blue-700 md:px-4 md:py-3 md:text-sm md:font-extrabold md:shadow-md md:shadow-sky-500/20 md:hover:opacity-95 md:active:scale-[0.99]"
          >
            <ShoppingCart className="hidden h-4 w-4 text-white md:block" />
            <span className="md:hidden">Add</span>
            <span className="hidden md:inline">{t("products.buyNow")}</span>
            <ArrowRight className="hidden h-4 w-4 text-sky-200 md:block" />
          </Link>
        )}

      </div>
    </div>
  );
}
