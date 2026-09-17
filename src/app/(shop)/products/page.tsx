import React, { Suspense } from "react";
import { getProducts } from "@/actions/products";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductCatalogToolbar } from "@/components/products/ProductCatalogToolbar";
import { Badge } from "@/components/ui/badge";
import { PackageOpen } from "lucide-react";
import type { ProductWithVariants } from "@/types";

interface ProductsPageProps {
  searchParams: Promise<{
    app?: string;
    type?: string;
    gauge?: string;
    length?: string;
    width?: string;
    q?: string;
  }>;
}

function parseVariantPrice(variant: ProductWithVariants["variants"][number]): number | null {
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

  if (Number.isFinite(product.startingPrice) && (product.startingPrice as number) > 0) {
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

function matchesLength(product: ProductWithVariants, targetLength: number): boolean {
  const productLength = Number(product.length_feet);
  if (Number.isFinite(productLength) && productLength === targetLength) {
    return true;
  }

  return (product.variants || []).some((v) => Number(v.lengthFeet) === targetLength);
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const rawType = resolvedParams.type || resolvedParams.app || "all";
  const appFilter = rawType as "all" | "hand" | "machine";
  const gaugeFilter = resolvedParams.gauge;
  const lengthFilter = resolvedParams.length;
  const widthFilter = resolvedParams.width;
  const searchQuery = (resolvedParams.q || "").trim().toLowerCase();

  let products = await getProducts(appFilter);

  if (gaugeFilter && gaugeFilter !== "all") {
    const targetGauge = parseInt(gaugeFilter, 10);
    products = (products || []).filter((p) =>
      p?.variants?.some((v) => v?.gauge === targetGauge) || p?.gauge === targetGauge
    );
  }

  if (lengthFilter && lengthFilter !== "all") {
    const targetLength = parseInt(lengthFilter, 10);
    if (Number.isFinite(targetLength)) {
      products = (products || []).filter((p) => matchesLength(p, targetLength));
    }
  }

  if (widthFilter && widthFilter !== "all") {
    const targetWidth = parseInt(widthFilter, 10);
    if (Number.isFinite(targetWidth)) {
      products = (products || []).filter((p) => matchesWidth(p, targetWidth));
    }
  }

  if (searchQuery) {
    products = (products || []).filter((p) => {
      const haystack = [
        p?.title,
        p?.name,
        p?.description,
        p?.shortDescription,
        p?.brand,
        p?.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchQuery);
    });
  }

  // Always sort cheapest → most expensive before rendering the grid
  products = [...(products || [])].sort(
    (a, b) => getStartingPrice(a) - getStartingPrice(b)
  );

  return (
    <div className="py-12 bg-slate-50/40 min-h-[calc(100vh-200px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-2">
          <Badge variant="default" className="uppercase text-xs tracking-wider font-bold">
            Industrial Catalog
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Stretch Films & Technical Specifications
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Browse our high-performance manual cast stretch films, complete dimensional specifications matrix, and direct wholesale volume pricing.
          </p>
        </div>

        <div className="mb-6">
          <Suspense fallback={<div className="h-12 rounded-2xl bg-white border border-slate-200 animate-pulse" />}>
            <ProductCatalogToolbar />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-3">
            <Suspense fallback={<div className="h-48 bg-white border border-slate-200 rounded-3xl animate-pulse" />}>
              <ProductFilters />
            </Suspense>
          </div>

          <div className="lg:col-span-9">
            {products.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-sm">
                <PackageOpen className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">No products found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No stretch film matched the selected application, gauge, length, or width criteria. Try resetting your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, idx) => (
                  <div key={product?.id || idx} className="h-full">
                    <ProductCard product={product} priority={idx < 3} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
