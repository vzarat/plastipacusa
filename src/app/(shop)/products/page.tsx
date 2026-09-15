import React, { Suspense } from "react";
import { getProducts } from "@/actions/products";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductCatalogToolbar } from "@/components/products/ProductCatalogToolbar";
import { Badge } from "@/components/ui/badge";
import { PackageOpen } from "lucide-react";

interface ProductsPageProps {
  searchParams: Promise<{
    app?: string;
    type?: string;
    gauge?: string;
    q?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const rawType = resolvedParams.type || resolvedParams.app || "all";
  const appFilter = rawType as "all" | "hand" | "machine";
  const gaugeFilter = resolvedParams.gauge;
  const searchQuery = (resolvedParams.q || "").trim().toLowerCase();

  let products = await getProducts(appFilter);

  if (gaugeFilter && gaugeFilter !== "all") {
    const targetGauge = parseInt(gaugeFilter, 10);
    products = (products || []).filter((p) =>
      p?.variants?.some((v) => v?.gauge === targetGauge)
    );
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
                  No stretch film matched the selected application and gauge criteria. Try resetting your filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {(products || []).map((product, idx) => (
                  <ProductCard
                    key={product?.id || idx}
                    product={product}
                    priority={idx < 3}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
