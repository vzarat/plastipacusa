import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithVariants } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowRight, CheckCircle2, Box, Layers } from "lucide-react";

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

export function ProductCard({ product, priority = false }: ProductCardProps) {
  // Resolve category brand logo
  const categorySlug =
    (product as any)?.categorySlug ||
    (product as any)?.category?.slug ||
    "force-standard";
  const categoryLogo =
    CATEGORY_LOGOS[categorySlug] || CATEGORY_LOGOS["force-standard"];

  // Find primary variant (1 Box with 4 rolls: $20.71) or minimum price
  const primaryVariant = product?.variants?.[0];
  const primaryPrice = primaryVariant?.priceUsd ? parseFloat(primaryVariant.priceUsd) : 20.71;

  const primaryImage =
    (product?.images && product.images[0]) ||
    product?.imageUrl ||
    DEFAULT_PRODUCT_IMAGE;

  const secondaryImage =
    product?.images && product.images.length > 1
      ? product.images[1]
      : null;

  return (
    <div className="group rounded-3xl border border-slate-200/90 bg-white overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-sky-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/10 card-hover-effect">
      <div>
        {/* 1. Clean Product Image Area (Completely free of floating dark pills and text overlays) */}
        <div className="relative aspect-[4/3] w-full bg-slate-50/50 overflow-hidden border-b border-slate-100 flex items-center justify-center">
          {/* Official Category Brand Logo Badge */}
          <div className="absolute top-3.5 left-3.5 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-sm flex items-center justify-center">
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
            alt={product.name || "Force Hand Stretch Film"}
            fill
            priority={priority}
            placeholder="empty"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className={`object-contain p-5 transition-all duration-300 ${
              secondaryImage
                ? "group-hover:opacity-0 group-hover:scale-95"
                : "group-hover:scale-105"
            }`}
          />

          {/* Secondary Product Image (Box Packaging on Hover) */}
          {secondaryImage && (
            <Image
              src={secondaryImage}
              alt={`${product.name} Packaging Box`}
              fill
              placeholder="empty"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-contain p-5 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none"
            />
          )}
        </div>

        {/* 2. Refined Product Info & B2B Volume Indicator */}
        <div className="p-6 pb-4 space-y-3.5">
          <div>
            <span className="text-[10px] font-mono uppercase text-sky-600 font-bold tracking-wider block">
              {product.brand || "FORCE"} • Industrial Cast Series
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-sky-600 transition-colors mt-0.5 line-clamp-1">
              <Link href={`/products/${product?.slug || "stretch-film-18-x-50-ga-x-1000ft"}`}>
                {product?.name || "Force™ Hand Stretch Film"}
              </Link>
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1.5">
              {product?.shortDescription ||
                "Premium industrial cast hand wrap engineered for high load retention and quiet unwind."}
            </p>
          </div>

          {/* B2B Volume Availability & Feature Badges */}
          <div className="space-y-2.5 pt-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/80 border border-sky-100 text-sky-800 text-[11px] font-semibold">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              <span>Volume tiers: Boxes & Pallets</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span>Multi-Layer Cast</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span>Ready to Ship</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Pricing Display & Full-Width High-Conversion CTA Button */}
      <div className="p-6 pt-0 space-y-3.5">
        {/* Dynamic Tier Price Header */}
        <div className="flex items-baseline justify-between pt-3 border-t border-slate-100">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              Starting at
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {formatCurrency(primaryPrice)}
              </span>
              <span className="text-xs font-bold text-slate-500">USD</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
            {primaryVariant?.rollsPerBox ? `${primaryVariant.rollsPerBox} Rolls / Box` : "4 Rolls / Box"}
          </span>
        </div>

        {/* High-Conversion "BUY NOW" Button */}
        <Link
          href={`/products/${product?.slug || "stretch-film-18-x-50-ga-x-1000ft"}`}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 text-white font-extrabold text-sm shadow-md shadow-sky-500/20 hover:opacity-95 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-200 active:scale-[0.99] group/btn"
        >
          <ShoppingCart className="w-4 h-4 text-white group-hover/btn:scale-110 transition-transform" />
          <span>BUY NOW</span>
          <ArrowRight className="w-4 h-4 text-sky-200 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
