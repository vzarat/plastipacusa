import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ProductWithVariants } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface ProductCardProps {
  product: ProductWithVariants;
  priority?: boolean;
}

const DEFAULT_PRODUCT_IMAGE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png";

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const minPrice = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => parseFloat(v.priceUsd)))
    : 0;

  const availableGauges = Array.from(
    new Set(product.variants.map((v) => v.gauge))
  ).sort((a, b) => a - b);

  const availableWidths = Array.from(
    new Set(product.variants.map((v) => `${parseFloat(v.widthInches)}"`))
  );

  const primaryImage =
    (product.images && product.images[0]) ||
    product.imageUrl ||
    DEFAULT_PRODUCT_IMAGE;

  const secondaryImage =
    product.images && product.images.length > 1
      ? product.images[1]
      : null;

  return (
    <div className="group rounded-3xl border border-slate-200/90 bg-white overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-sky-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/10 card-hover-effect">
      <div>
        {/* Image Header with App Badge & Hover Cross-Fade */}
        <div className="relative aspect-[4/3] w-full bg-slate-50/80 overflow-hidden border-b border-slate-100 flex items-center justify-center">
          {/* Default Image (Rolls) */}
          <Image
            src={primaryImage}
            alt={product.name || "Stretch Film Product"}
            fill
            priority={priority}
            placeholder="empty"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className={`object-contain p-4 transition-all duration-300 ${
              secondaryImage
                ? "group-hover:opacity-0 group-hover:scale-95"
                : "group-hover:scale-105"
            }`}
          />

          {/* Packaging Box Image (Hover Swap) */}
          {secondaryImage && (
            <Image
              src={secondaryImage}
              alt={`${product.name} Packaging Box`}
              fill
              placeholder="empty"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-contain p-4 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent pointer-events-none" />
          
          <div className="absolute top-3 left-3 flex gap-2 z-10">
            <Badge
              variant={product.application === "hand" ? "default" : "gradient"}
              className="uppercase tracking-wider text-[10px] font-bold shadow-sm"
            >
              {product.application === "hand" ? "Hand Stretch" : "Machine Stretch"}
            </Badge>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white z-10">
            <span className="font-mono text-[11px] bg-slate-900/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/20">
              {product.filmType}
            </span>
            <span className="text-[11px] text-sky-200 font-bold bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/10">
              {product.variants.length} Variants
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3.5">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>

          {/* Quick Specs Matrix with soft cyan pills */}
          <div className="py-3 px-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-medium">Gauges</span>
              <span className="font-bold text-sky-900">
                {availableGauges.join(", ")} Ga
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-medium">Widths</span>
              <span className="font-bold text-sky-900">
                {availableWidths.join(", ")}
              </span>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-1.5 pt-1">
            {product.features.slice(0, 2).map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Price & Action */}
      <div className="p-6 pt-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase font-medium">Starting from</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-slate-900">
              {formatCurrency(minPrice)}
            </span>
            <span className="text-[11px] text-slate-500">/ box (4 rolls)</span>
          </div>
        </div>

        <Button asChild size="sm" variant="gradient" className="gap-1.5 text-xs shadow-sm shadow-sky-500/10">
          <Link href={`/products/${product.slug}`}>
            <span>Configure</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
