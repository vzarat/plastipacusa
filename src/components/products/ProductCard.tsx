"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import Image from "next/image";
import { ProductWithVariants } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowRight, CheckCircle2, Box, Layers } from "lucide-react";
import {
  GENESIS_HP_SLUGS,
  MACHINE_FILM_IMAGE_URL,
  SERIES_GENESIS_HP,
  SERIES_GENESIS_STANDARD,
  STRETCH_FILM_PLACEHOLDER,
  isCatalogInStock,
} from "@/lib/products";
import {
  HAND_CATALOG_PALLET_LABEL,
  HAND_FULL_PALLET_BOXES,
  buildHandFullPalletCartItem,
  getDisplayPrice,
  handCatalogQuote,
} from "@/lib/pricing";
import { boxStockLabel, boxesPerPalletForProduct, palletStockLabel } from "@/lib/pallet-stock";
import { useCartStore } from "@/lib/store/useCartStore";
function isolateCardAction(event: React.MouseEvent | React.TouchEvent) {
  event.stopPropagation();
}

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
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
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

  const handQuote = isGenesis ? null : handCatalogQuote(product);

  const packagePrices = (product?.packageOptions || [])
    .map((opt) => Number(opt.price))
    .filter((p) => Number.isFinite(p) && p > 0);

  const startingPrice = Number((product as any)?.startingPrice);

  const priceCandidates = [
    ...packagePrices,
    ...(Number.isFinite(startingPrice) && startingPrice > 0 ? [startingPrice] : []),
  ];

  const resolvedPrice = getDisplayPrice(product);
  const primaryPrice =
    handQuote?.pricePerBox ??
    resolvedPrice ??
    (priceCandidates.length > 0 ? Math.min(...priceCandidates) : null);
  const primaryVariant = product?.variants?.[0];
  const cheapestPackage = [...(product?.packageOptions || [])].sort(
    (a, b) => a.price - b.price
  )[0];

  const rawImage =
    (product?.images && product.images[0]) || product?.imageUrl;

  const primaryImage = imageFailed
    ? STRETCH_FILM_PLACEHOLDER
    : isGenesis
      ? MACHINE_FILM_IMAGE_URL
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
  const isSoldOut = !isCatalogInStock(product);
  const palletCount = Number(product.stockQuantity) || 0;
  const boxesPerPallet = boxesPerPalletForProduct({
    application: product.application,
    widthInches: width,
    gauge: product.gauge,
    lengthFeet: product.length_feet,
    slug: product.slug,
    name: product.name,
    boxesPerPallet: product.boxesPerPallet,
  });
  const palletLabel =
    !isSoldOut && product.stockBoxes != null
      ? boxStockLabel(product.stockBoxes, boxesPerPallet)
      : !isSoldOut && palletCount > 0
        ? palletStockLabel(palletCount, boxesPerPallet)
        : null;
  const variant64 = (product.variants || []).find(
    (variant) => Number(variant.boxes_count ?? variant.boxesCount) === HAND_FULL_PALLET_BOXES
  );
  const addFullPallet = (goToCheckout: boolean) => {
    if (isSoldOut || !handQuote?.fullPallet) return;
    const line = buildHandFullPalletCartItem(product, variant64);
    if (!line) return;
    addItem(line);
    if (goToCheckout) router.push("/checkout");
  };
  const widthLabel = width > 0 ? `${Math.round(width)} IN` : null;
  const gaugeValue = Number(product.gauge);
  const gaugeLabel = Number.isFinite(gaugeValue) && gaugeValue > 0 ? `${gaugeValue} GA` : null;
  const specLine = [widthLabel, gaugeLabel].filter(Boolean).join(" | ");
  const comparePrice =
    priceCandidates.length > 1 ? Math.max(...priceCandidates) : null;
  const showCompare =
    !handQuote &&
    primaryPrice !== null &&
    comparePrice !== null &&
    comparePrice > primaryPrice;
  const productHref = `/products/${product?.slug || "stretch-film-18-x-60-ga-x-1000ft"}`;
  const openProduct = () => {
    router.push(productHref);
  };
  const onCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openProduct();
  };
  const statusBadge = isSoldOut ? "SOLD OUT" : showCompare ? "HOT DEAL" : null;

  const volumeTierLabel =
    !isGenesis && handQuote != null
    ? "Volume tiers: 1, 16, 32 & 64 boxes"
    : availableTiers.length > 0
      ? `Volume tiers: ${availableTiers.join(" & ")}`
      : isGenesis
        ? "Volume tiers: Rolls & Pallets"
        : "Volume tiers: Boxes & Pallets";

  return (
    <>
    <article
      role="link"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={onCardKeyDown}
      className="flex w-full cursor-pointer gap-3 bg-white py-3 transition-colors duration-200 hover:bg-slate-50 md:hidden"
    >
      <div className="relative w-[35%] shrink-0">
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          <Image
            src={primaryImage}
            alt={title}
            fill
            priority={priority}
            sizes="35vw"
            className="object-contain p-2"
            onError={() => setImageFailed(true)}
          />
          {statusBadge ? (
            <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white ${
              isSoldOut ? "bg-slate-500" : "bg-red-600"
            }`}>
              {statusBadge}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 w-[65%] flex-col">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
          <Link href={productHref} onClick={isolateCardAction}>
            {title}
          </Link>
        </h3>
        {specLine && (
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {specLine}
          </p>
        )}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-red-600">
            {primaryPrice != null && primaryPrice > 0 ? formatCurrency(primaryPrice) : "—"}
            {handQuote ? (
              <span className="ml-1 text-[11px] font-semibold text-slate-500">
                USD / box
              </span>
            ) : null}
          </span>
          {showCompare && (
            <span className="text-xs text-slate-400 line-through">
              {formatCurrency(comparePrice)}
            </span>
          )}
        </div>
        {palletLabel ? (
          <p className="mt-1 text-[11px] font-semibold text-emerald-700">{palletLabel}</p>
        ) : null}
        {handQuote?.fullPallet ? (
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {HAND_CATALOG_PALLET_LABEL}
          </p>
        ) : null}
        <div className="mt-auto flex justify-end pt-2">
          {isSoldOut ? (
            <span className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500">
              {t("products.soldOut")}
            </span>
          ) : handQuote?.fullPallet ? (
            <button
              type="button"
              onClick={(event) => {
                isolateCardAction(event);
                addFullPallet(false);
              }}
              onTouchEnd={isolateCardAction}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white active:scale-95"
            >
              Add
            </button>
          ) : (
            <Link
              href={productHref}
              onClick={isolateCardAction}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white active:scale-95"
            >
              Add
            </Link>
          )}
        </div>
      </div>
    </article>
    <div
      role="link"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={onCardKeyDown}
      className="group hidden h-full cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white transition-all duration-300 hover:border-sky-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/10 card-hover-effect md:flex"
    >
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
              <Link href={productHref} onClick={isolateCardAction}>
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
                <span>
                  {isSoldOut ? t("products.soldOut") : palletLabel || t("products.readyToShip")}
                </span>
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
                {primaryPrice != null && primaryPrice > 0 ? formatCurrency(primaryPrice) : "—"}
              </span>
              {handQuote && primaryPrice !== null && (
                <span className="hidden text-xs font-bold text-slate-500 md:inline">
                  USD / box
                </span>
              )}
              {!handQuote && primaryPrice !== null && (
                <span className="hidden text-xs font-bold text-slate-500 md:inline">
                  USD
                </span>
              )}
            </div>
            {handQuote?.fullPallet ? (
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {HAND_CATALOG_PALLET_LABEL}
              </p>
            ) : null}
          </div>
          {handQuote?.fullPallet ? null : (
            <span className="hidden rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 md:inline">
              {isGenesis
                ? "Machine Roll"
                : cheapestPackage?.rolls
                ? `${cheapestPackage.rolls} Rolls`
                : primaryVariant?.rollsPerBox
                ? `${primaryVariant.rollsPerBox} Rolls / Box`
                : "Package"}
            </span>
          )}
        </div>

        {/* High-Conversion "BUY NOW" Button */}
        {isSoldOut ? (
          <button
            type="button"
            disabled
            onClick={isolateCardAction}
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-xs font-extrabold text-slate-500 md:px-4 md:py-3 md:text-sm"
          >
            {t("products.soldOut")}
          </button>
        ) : handQuote?.fullPallet ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                isolateCardAction(event);
                addFullPallet(false);
              }}
              onTouchEnd={isolateCardAction}
              className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white active:scale-95 md:hidden"
            >
              Add
            </button>
            <button
              type="button"
              onClick={(event) => {
                isolateCardAction(event);
                addFullPallet(true);
              }}
              onTouchEnd={isolateCardAction}
              className="group/btn hidden w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-sky-500/20 hover:opacity-95 active:scale-[0.99] md:flex"
            >
              <ShoppingCart className="h-4 w-4 text-white" />
              {t("products.buyNow")}
              <ArrowRight className="h-4 w-4 text-sky-200" />
            </button>
          </>
        ) : (
          <Link
            href={productHref}
            onClick={isolateCardAction}
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
    </>
  );
}
