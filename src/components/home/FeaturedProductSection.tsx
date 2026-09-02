"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ProductWithVariants } from "@/types";
import { ProductCard } from "@/components/products/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, PhoneCall, Layers, RotateCcw } from "lucide-react";
import { useCategoryStore } from "@/lib/store/useCategoryStore";
import { PRODUCT_CATEGORIES } from "@/data/categories";
import { CategorySectionDivider } from "@/components/catalog/CategorySectionDivider";

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

  // Filtered categories for the All Products view: categories that contain products
  const categoriesWithProducts = useMemo(() => {
    return PRODUCT_CATEGORIES.filter(
      (cat) => (groupedProducts[cat.slug]?.length || 0) > 0
    );
  }, [groupedProducts]);

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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="gap-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Show All Products</span>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="gap-2 rounded-xl border-slate-200 hover:bg-slate-50"
            >
              <Link href="/products">
                <span>View Full Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* 1. FILTERED VIEW: Specific category tab is selected */}
        {selectedCategory ? (
          <div className="space-y-8">
            {/* Category Section Divider at the top */}
            <CategorySectionDivider categorySlug={selectedCategory} />

            {activeCategoryProducts.length > 0 ? (
              <div
                className={`grid gap-6 ${
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
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4">
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
                <Button asChild variant="outline" size="sm" className="border-slate-200 mt-2">
                  <Link href="#inquiry-form">
                    <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                    <span>Request Custom Specs</span>
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* 2. INITIAL VIEW / ALL PRODUCTS FEED: Grouped by Category */
          <div className="space-y-14 md:space-y-18">
            {categoriesWithProducts.map((category) => {
              const categoryItems = groupedProducts[category.slug] || [];

              return (
                <div key={category.slug} className="space-y-8">
                  {/* Category Section Divider Ribbon before each category's grid */}
                  <CategorySectionDivider categorySlug={category.slug} />

                  {/* Category Products Grid (showing up to 4 featured products per row) */}
                  <div
                    className={`grid gap-6 ${
                      categoryItems.length <= 2
                        ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto"
                        : categoryItems.length === 3
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                    }`}
                  >
                    {categoryItems.slice(0, 4).map((product, idx) => (
                      <ProductCard
                        key={product?.id || idx}
                        product={product}
                        priority={idx < 4}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
