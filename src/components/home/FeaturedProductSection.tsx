"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ProductWithVariants } from "@/types";
import { ProductCard } from "@/components/products/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, PhoneCall, Layers } from "lucide-react";
import { useCategoryStore } from "@/lib/store/useCategoryStore";
import { PRODUCT_CATEGORIES } from "@/data/categories";

interface FeaturedProductSectionProps {
  products: ProductWithVariants[];
}

export function FeaturedProductSection({ products }: FeaturedProductSectionProps) {
  const selectedCategory = useCategoryStore((s) => s.selectedCategory);

  const activeCategoryMeta = useMemo(() => {
    if (!selectedCategory) return null;
    return PRODUCT_CATEGORIES.find((c) => c.slug === selectedCategory) || null;
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (!selectedCategory) return products;

    // Filter products matching the active category slug
    const matched = products.filter((p) => {
      if (p.categorySlug) {
        return p.categorySlug === selectedCategory;
      }

      // Fallback matching by application / brand if categorySlug is missing
      if (selectedCategory === "force-standard" || selectedCategory === "force-elite") {
        return p.application === "hand";
      }
      if (selectedCategory === "genesis-standard" || selectedCategory === "genesis-high-performance") {
        return p.application === "machine";
      }
      return true;
    });

    return matched.length > 0 ? matched : products;
  }, [products, selectedCategory]);

  return (
    <section
      id="product-catalog-section"
      className="py-16 sm:py-20 bg-white border-b border-slate-100 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Dynamic Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
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

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product, idx) => (
            <ProductCard
              key={product?.id || idx}
              product={product}
              priority={idx < 4}
            />
          ))}

          {/* Quick Wholesale Inquire Card when active category has limited items */}
          {activeCategoryMeta && filteredProducts.length < 4 && (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between text-center hover:border-slate-300 transition-colors">
              <div className="my-auto space-y-3 py-6">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-xs"
                  style={{
                    backgroundColor: `${activeCategoryMeta.accentHex}15`,
                    color: activeCategoryMeta.accentHex,
                  }}
                >
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Need Custom {activeCategoryMeta.name} Specs?
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  We manufacture custom roll widths, gauges, and pre-stretch ratios directly from our extrusion mills.
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full border-slate-200">
                <Link href="#quote-section">
                  <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-sky-600" />
                  <span>Request Custom Specs</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
