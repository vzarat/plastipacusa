import React, { Suspense } from "react";
import { getProducts } from "@/actions/products";
import { ProductCatalog } from "@/components/products/ProductCatalog";
import { CatalogPageHeader } from "@/components/products/CatalogPageHeader";
import type { CatalogAppFilter } from "@/components/products/ProductCatalog";

interface ProductsPageProps {
  searchParams: Promise<{
    app?: string;
    type?: string;
    category?: string;
    gauge?: string;
    length?: string;
    width?: string;
    q?: string;
    page?: string;
  }>;
}

function CatalogFallback() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-12 rounded-2xl bg-slate-200/70" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 h-80 rounded-2xl bg-slate-200/60" />
        <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-200/60" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const rawType = resolvedParams.type || resolvedParams.app || "all";
  const initialApp = (
    ["all", "hand", "machine"].includes(rawType) ? rawType : "all"
  ) as CatalogAppFilter;
  const initialCategory = resolvedParams.category || "all";
  const pageRaw = Number(resolvedParams.page || "1");
  const initialPage =
    Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  // Fetch full catalog once; filtering/sorting happens client-side for instant UX
  const allProducts = await getProducts("all");

  return (
    <div className="py-12 bg-slate-50/40 min-h-[calc(100vh-200px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CatalogPageHeader />

        <Suspense fallback={<CatalogFallback />}>
          <ProductCatalog
            allProducts={allProducts || []}
            initialApp={initialApp}
            initialCategory={initialCategory}
            initialWidth={resolvedParams.width || "all"}
            initialGauge={resolvedParams.gauge || "all"}
            initialLength={resolvedParams.length || "all"}
            initialQuery={resolvedParams.q || ""}
            initialPage={initialPage}
          />
        </Suspense>
      </div>
    </div>
  );
}
