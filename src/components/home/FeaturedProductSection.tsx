"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ProductWithVariants } from "@/types";
import { ProductCard } from "@/components/products/ProductCard";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, PhoneCall, Layers, RotateCcw } from "lucide-react";
import { useCategoryStore } from "@/lib/store/useCategoryStore";
import { PRODUCT_CATEGORIES } from "@/data/categories";

interface FeaturedProductSectionProps {
  products: ProductWithVariants[];
}

export function FeaturedProductSection({ products }: FeaturedProductSectionProps) {
  const selectedCategory = useCategoryStore((s) => s.selectedCategory);
  const setSelectedCategory = useCategoryStore((s) => s.setSelectedCategory);

  const activeCategoryMeta = useMemo(() => {
    if (!selectedCategory) return null;
    return PRODUCT_CATEGORIES.find((c) => c.slug === selectedCategory) || null;
  }, [selectedCategory]);

  // Group the product list by category slug
  const groupedProducts = useMemo(() => {
    const map: Record<string, ProductWithVariants[]> = {
      "force-standard": [],
      "force-elite": [],
      "genesis-standard": [],
      "genesis-high-performance": [],
    };

    (products || []).forEach((product) => {
      const slug =
        product.categorySlug ||
        (product.brand?.toLowerCase().includes("elite")
          ? "force-elite"
          : product.brand?.toLowerCase().includes("genesis")
          ? product.name?.toLowerCase().includes("hp")
            ? "genesis-high-performance"
            : "genesis-standard"
          : "force-standard");

      if (!map[slug]) {
        map[slug] = [];
      }
      map[slug].push(product);
    });

    return map;
  }, [products]);

  const activeCategoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return groupedProducts[selectedCategory] || [];
  }, [selectedCategory, groupedProducts]);

  return (
    <section
      id="product-catalog-section"
      className="py-16 sm:py-20 bg-white border-b border-slate-100 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="default"
                className="uppercase text-xs tracking-wider font-bold"
                style={{
                  backgroundColor: activeCategoryMeta
                    ? `${activeCategoryMeta.accentHex}15`
                    : undefined,
                  color: activeCategoryMeta ? activeCategoryMeta.accentHex : undefined,
                  borderColor: activeCategoryMeta
                    ? `${activeCategoryMeta.accentHex}30`
                    : undefined,
                }}
              >
                {activeCategoryMeta ? activeCategoryMeta.name : "Direct Mill Catalog"}
              </Badge>
              {activeCategoryMeta && (
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  • {activeCategoryMeta.type}
                </span>
              )}
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {activeCategoryMeta
                ? `Featured ${activeCategoryMeta.name} Film Series`
                : "Featured Industrial Film Series"}
            </h2>

            <p className="text-sm text-slate-600 max-w-xl leading-relaxed">
              {activeCategoryMeta
                ? activeCategoryMeta.description
                : "Precision cast polyethylene pallet wrap formulated for high load security and maximum roll yield."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Show All Products</span>
              </button>
            )}
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-200"
            >
              <span>View Full Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Product Grid Area */}
        {selectedCategory ? (
          activeCategoryProducts.length > 0 ? (
            <div
              className={`grid gap-6 mt-8 sm:mt-10 ${
                activeCategoryProducts.length <= 2
                  ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto"
                  : activeCategoryProducts.length === 3
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              }`}
            >
              {activeCategoryProducts.map((product, idx) => (
                <ProductCard
                  key={product?.id || idx}
                  product={product}
                  priority={idx < 4}
                />
              ))}
            </div>
          ) : (
            /* Custom Mill Specs Inquire Card when active category has no retail items yet */
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4 mt-8 sm:mt-10">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: `${activeCategoryMeta?.accentHex || "#0284c7"}15`,
                  color: activeCategoryMeta?.accentHex || "#0284c7",
                }}
              >
                <Layers className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                  Need Custom {activeCategoryMeta?.name || "Extrusion"} Specs?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  We manufacture custom roll widths, gauges, and pre-stretch formulations directly from our extrusion mills for high-volume enterprise operations.
                </p>
              </div>
              <Link
                href="#inquiry-form"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 mt-2 transition-all shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5 mr-1 text-sky-600" />
                <span>Request Custom Specs</span>
              </Link>
            </div>
          )
        ) : (
          /* All Products Feed: Sits directly below header */
          <div
            className={`grid gap-6 mt-8 sm:mt-10 ${
              products.length <= 2
                ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto"
                : products.length === 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {products.map((product, idx) => (
              <ProductCard
                key={product?.id || idx}
                product={product}
                priority={idx < 4}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
