"use client";

import React, { useState } from "react";
import { ProductWithVariants, ProductVariant } from "@/types";
import { VariantSelector } from "@/components/products/VariantSelector";
import { formatCurrency } from "@/lib/utils";
import { PhoneCall } from "lucide-react";

interface ProductDetailProps {
  product: ProductWithVariants;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants[0]
  );

  const title = product.title || product.name || "Stretch Film";
  const rawPrice =
    (selectedVariant as any)?.price ??
    (selectedVariant?.priceUsd ? parseFloat(selectedVariant.priceUsd) : null) ??
    product.startingPrice ??
    20.71;
  const mainPrice = typeof rawPrice === "number" ? rawPrice : parseFloat(String(rawPrice || 0));

  return (
    <div className="space-y-6">
      {/* Product Title & Film Type Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono uppercase text-sky-600 font-bold tracking-wider">
            {product.brand} • {product.filmType || "Cast Co-Extruded Multi-Layer"}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>

        {/* Main Top Price Display reflecting selected variant */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {formatCurrency(mainPrice)}
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            USD / Unit
          </span>
          {selectedVariant && (
            <span className="ml-2 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {(selectedVariant as any).title || selectedVariant.packageSize || selectedVariant.sku}
            </span>
          )}
        </div>

        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          {product.description}
        </p>
      </div>

      {/* Interactive Variant & Packaging Selector */}
      <VariantSelector
        product={product}
        selectedVariant={selectedVariant}
        onVariantChange={setSelectedVariant}
      />

      {/* Direct Tech Support CTA */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <PhoneCall className="w-4 h-4 text-sky-600" />
          <span>Need custom specs? Call <strong className="text-slate-900">(956) 400 36 83</strong></span>
        </div>
        <a
          href="tel:+19564003683"
          className="font-bold text-sky-600 hover:text-sky-700 transition-colors"
        >
          Call Specialist →
        </a>
      </div>
    </div>
  );
}

