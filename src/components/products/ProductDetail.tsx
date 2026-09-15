"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ProductWithVariants, ProductVariant } from "@/types";
import { VariantSelector } from "@/components/products/VariantSelector";
import { PhoneCall } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface ProductDetailProps {
  product: ProductWithVariants;
}

function resolveVariantPrice(variant: ProductVariant | any): number | null {
  const raw = variant?.price ?? variant?.priceUsd;
  if (raw === null || raw === undefined || raw === "") return null;
  const value = typeof raw === "number" ? raw : parseFloat(String(raw));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function buildInitialVariant(product: ProductWithVariants): ProductVariant | any {
  const packageOptions = product.packageOptions || [];
  if (packageOptions.length > 0) {
    const cheapest = [...packageOptions].sort((a, b) => a.price - b.price)[0];
    return {
      id: cheapest.sku,
      sku: cheapest.sku,
      packageSize: cheapest.label,
      title: cheapest.label,
      priceUsd: String(cheapest.price),
      price: cheapest.price,
      rollsPerBox: cheapest.rolls,
    };
  }

  if (product.variants?.length) {
    return [...product.variants].sort(
      (a, b) => (resolveVariantPrice(a) || Infinity) - (resolveVariantPrice(b) || Infinity)
    )[0];
  }

  if (product.startingPrice && product.startingPrice > 0) {
    return {
      id: `${product.slug}-base`,
      sku: product.partNumber || product.slug,
      packageSize: "BASE UNIT",
      title: "BASE UNIT",
      priceUsd: String(product.startingPrice),
      price: product.startingPrice,
      rollsPerBox: 1,
    };
  }

  return product.variants?.[0];
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { t } = useLanguage();

  const initialVariant = useMemo(() => buildInitialVariant(product), [product]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | any>(initialVariant);

  useEffect(() => {
    setSelectedVariant(initialVariant);
  }, [initialVariant]);

  const title = product.title || product.name || "Stretch Film";

  return (
    <div className="space-y-6">
      {/* Product Title & Film Type Header — price lives only in VariantSelector card */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono uppercase text-sky-600 font-bold tracking-wider">
            {product.brand} • {product.filmType || "Cast Co-Extruded Multi-Layer"}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>

        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          {product.description}
        </p>
      </div>

      {/* Interactive Variant & Packaging Selector (single official price display) */}
      <VariantSelector
        product={product}
        selectedVariant={selectedVariant}
        onVariantChange={setSelectedVariant}
      />

      {/* Direct Tech Support CTA */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <PhoneCall className="w-4 h-4 text-sky-600" />
          <span>
            {t("products.needCustomSpecs")} <strong className="text-slate-900">(956) 400 36 83</strong>
          </span>
        </div>
        <a
          href="tel:+19564003683"
          className="font-bold text-sky-600 hover:text-sky-700 transition-colors"
        >
          {t("products.callSpecialist")}
        </a>
      </div>
    </div>
  );
}
