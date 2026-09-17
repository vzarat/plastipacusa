import React from "react";
import { getProducts } from "@/actions/products";
import { ProductCatalog } from "@/components/products/ProductCatalog";
import { Badge } from "@/components/ui/badge";
import type { CatalogAppFilter } from "@/components/products/ProductCatalog";

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

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;
  const rawType = resolvedParams.type || resolvedParams.app || "all";
  const initialApp = (
    ["all", "hand", "machine"].includes(rawType) ? rawType : "all"
  ) as CatalogAppFilter;

  // Fetch full catalog once; filtering/sorting happens client-side for instant UX
  const allProducts = await getProducts("all");

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
            Browse our high-performance manual cast stretch films, complete dimensional
            specifications matrix, and direct wholesale volume pricing.
          </p>
        </div>

        <ProductCatalog
          allProducts={allProducts || []}
          initialApp={initialApp}
          initialWidth={resolvedParams.width || "all"}
          initialGauge={resolvedParams.gauge || "all"}
          initialLength={resolvedParams.length || "all"}
          initialQuery={resolvedParams.q || ""}
        />
      </div>
    </div>
  );
}
