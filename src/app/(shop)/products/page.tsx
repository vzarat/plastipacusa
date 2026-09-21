import React from "react";
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
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const rawType = resolvedParams.type || resolvedParams.app || "all";
  const initialApp = (
    ["all", "hand", "machine"].includes(rawType) ? rawType : "all"
  ) as CatalogAppFilter;
  const initialCategory = resolvedParams.category || "all";

  // Fetch full catalog once; filtering/sorting happens client-side for instant UX
  const allProducts = await getProducts("all");

  return (
    <div className="py-12 bg-slate-50/40 min-h-[calc(100vh-200px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CatalogPageHeader />

        <ProductCatalog
          allProducts={allProducts || []}
          initialApp={initialApp}
          initialCategory={initialCategory}
          initialWidth={resolvedParams.width || "all"}
          initialGauge={resolvedParams.gauge || "all"}
          initialLength={resolvedParams.length || "all"}
          initialQuery={resolvedParams.q || ""}
        />
      </div>
    </div>
  );
}
