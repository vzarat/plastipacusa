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

export function ProductCard({ product, priority = false }: ProductCardProps) {
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
          {/* Top Category Badge */}
          <div className="absolute top-3.5 left-3.5 z-10">
            <Badge
              variant="default"
              className="uppercase tracking-wider text-[10px] font-bold shadow-sm bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50"
            >
              {product?.application === "machine" ? "MACHINE STRETCH" : "HAND STRETCH"}
            </Badge>
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

        {/* 2. Refined Product Info & Specifications Block */}
        <div className="p-6 space-y-4">
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

          {/* Product Specifications Matrix (Crucial for Sales Conversion) */}
          <div className="rounded-2xl bg-slate-50/90 border border-slate-200/80 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[11px] font-medium">Dimensions:</span>
              <span className="font-mono font-bold text-slate-900 text-xs">
                {primaryVariant?.widthInches
                  ? `${Math.round(parseFloat(primaryVariant.widthInches))}" X ${primaryVariant.gauge} GA X ${primaryVariant.lengthFeet}FT`
                  : product?.name || '18" X 50 GA X 1000FT'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
              <span className="text-slate-500 text-[11px] font-medium">Packaging:</span>
              <span className="font-bold text-sky-800 text-xs truncate max-w-[180px]">
                {primaryVariant?.packageSize || "1 Box (4 Rolls) • Pallets Available"}
              </span>
            </div>
          </div>

          {/* Feature Badges */}
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

      {/* 3. Pricing Display & Full-Width High-Conversion CTA Button */}
      <div className="p-6 pt-0 space-y-3.5">
        {/* Dynamic Tier Price Header */}
        <div className="flex items-baseline justify-between pt-3 border-t border-slate-100">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              Starting Price (1 Box)
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
