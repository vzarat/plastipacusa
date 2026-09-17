"use client";

import React, { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PackageOpen } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import {
  ProductFilters,
  type CatalogAppFilter,
} from "@/components/products/ProductFilters";
import { ProductCatalogToolbar } from "@/components/products/ProductCatalogToolbar";
import type { ProductWithVariants } from "@/types";

export type { CatalogAppFilter };

interface ProductCatalogProps {
  allProducts: ProductWithVariants[];
  initialApp?: CatalogAppFilter;
  initialWidth?: string;
  initialGauge?: string;
  initialLength?: string;
  initialQuery?: string;
}

function parseVariantPrice(
  variant: ProductWithVariants["variants"][number]
): number | null {
  const raw = Number(
    (variant as { price?: number | string }).price ?? variant.priceUsd
  );
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function getStartingPrice(product: ProductWithVariants): number {
  const variantPrices = (product.variants || [])
    .map(parseVariantPrice)
    .filter((p): p is number => p !== null);

  if (variantPrices.length > 0) {
    return Math.min(...variantPrices);
  }

  if (
    Number.isFinite(product.startingPrice) &&
    (product.startingPrice as number) > 0
  ) {
    return product.startingPrice as number;
  }

  const packagePrices = (product.packageOptions || [])
    .map((opt) => Number(opt.price))
    .filter((p) => Number.isFinite(p) && p > 0);

  if (packagePrices.length > 0) {
    return Math.min(...packagePrices);
  }

  return Number.POSITIVE_INFINITY;
}

function matchesWidth(product: ProductWithVariants, targetWidth: number): boolean {
  const productWidth = Number(product.widthInches ?? product.width_inches);
  if (Number.isFinite(productWidth) && Math.round(productWidth) === targetWidth) {
    return true;
  }

  return (product.variants || []).some((v) => {
    const w = Number(v.widthInches);
    return Number.isFinite(w) && Math.round(w) === targetWidth;
  });
}

function parseLengthFeet(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  // Supports 6000, "6000", "6,000", "6,000 FT", "6000FT"
  const normalized = raw.replace(/,/g, "").replace(/\s*ft\b\.?/i, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function matchesLength(
  product: ProductWithVariants,
  targetLength: number
): boolean {
  const productLength = parseLengthFeet(
    product.length_feet ?? (product as { lengthFeet?: number | string }).lengthFeet
  );
  if (productLength !== null && productLength === targetLength) {
    return true;
  }

  if (
    (product.variants || []).some((v) => {
      const variantLength = parseLengthFeet(v.lengthFeet);
      return variantLength !== null && variantLength === targetLength;
    })
  ) {
    return true;
  }

  // Slug fallback e.g. stretch-film-20-x-60-ga-x-6000ft
  const slug = String(product.slug || "").toLowerCase();
  return slug.includes(`x-${targetLength}ft`) || slug.endsWith(`-${targetLength}ft`);
}

function matchesGauge(product: ProductWithVariants, targetGauge: number): boolean {
  if (product.gauge === targetGauge) return true;
  return (product.variants || []).some((v) => v?.gauge === targetGauge);
}

function excludeFiftyGauge(product: ProductWithVariants): boolean {
  if (product?.gauge === 50) return false;
  const slug = String(product?.slug || "").toLowerCase();
  if (slug.includes("50-ga") || slug.includes("-50ga")) return false;
  const label = `${product?.title || ""} ${product?.name || ""}`.toLowerCase();
  if (/\b50\s*ga(uge)?\b/.test(label)) return false;
  return true;
}

export function ProductCatalog({
  allProducts,
  initialApp = "all",
  initialWidth = "all",
  initialGauge = "all",
  initialLength = "all",
  initialQuery = "",
}: ProductCatalogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedAppType, setSelectedAppType] =
    useState<CatalogAppFilter>(initialApp);
  const [selectedWidth, setSelectedWidth] = useState(initialWidth);
  const [selectedGauge, setSelectedGauge] = useState(initialGauge);
  const [selectedLength, setSelectedLength] = useState(initialLength);
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
    startTransition(() => {
      setter(value);
    });
  };

  const resetFilters = () => {
    startTransition(() => {
      setSelectedAppType("all");
      setSelectedWidth("all");
      setSelectedGauge("all");
      setSelectedLength("all");
      setSearchQuery("");
    });
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allProducts
      .filter(excludeFiftyGauge)
      .map((p) => ({
        ...p,
        variants: (p.variants || []).filter((v) => Number(v.gauge) !== 50),
      }))
      .filter((product) => {
        if (selectedAppType !== "all" && product.application !== selectedAppType) {
          return false;
        }

        if (selectedWidth !== "all") {
          const targetWidth = parseInt(selectedWidth, 10);
          if (
            Number.isFinite(targetWidth) &&
            !matchesWidth(product, targetWidth)
          ) {
            return false;
          }
        }

        if (selectedGauge !== "all") {
          const targetGauge = parseInt(selectedGauge, 10);
          if (
            Number.isFinite(targetGauge) &&
            !matchesGauge(product, targetGauge)
          ) {
            return false;
          }
        }

        if (selectedLength !== "all") {
          const targetLength = parseInt(selectedLength, 10);
          if (
            Number.isFinite(targetLength) &&
            !matchesLength(product, targetLength)
          ) {
            return false;
          }
        }

        if (q) {
          const haystack = [
            product?.title,
            product?.name,
            product?.description,
            product?.shortDescription,
            product?.brand,
            product?.slug,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => getStartingPrice(a) - getStartingPrice(b));
  }, [
    allProducts,
    selectedAppType,
    selectedWidth,
    selectedGauge,
    selectedLength,
    searchQuery,
  ]);

  return (
    <div className="space-y-6">
      <ProductCatalogToolbar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSubmitSearch={(value) => {
          startTransition(() => setSearchQuery(value));
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3">
          <ProductFilters
            selectedApp={selectedAppType}
            selectedWidth={selectedWidth}
            selectedGauge={selectedGauge}
            selectedLength={selectedLength}
            onAppChange={(value) => updateFilter(setSelectedAppType, value)}
            onWidthChange={(value) => updateFilter(setSelectedWidth, value)}
            onGaugeChange={(value) => updateFilter(setSelectedGauge, value)}
            onLengthChange={(value) => updateFilter(setSelectedLength, value)}
            onReset={resetFilters}
          />
        </div>

        <div
          className={`lg:col-span-9 transition-opacity duration-150 ${
            isPending ? "opacity-70" : "opacity-100"
          }`}
        >
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-sm">
              <PackageOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">No products found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No stretch film matched the selected application, gauge, length, or
                width criteria. Try resetting your filters.
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, idx) => (
                  <motion.div
                    key={product?.id ?? product?.slug ?? idx}
                    layout
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -10 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="h-full"
                  >
                    <ProductCard product={product} priority={idx < 3} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
