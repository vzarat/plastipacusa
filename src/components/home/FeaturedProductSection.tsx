"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ProductWithVariants } from "@/types";
import { ProductCard } from "@/components/products/ProductCard";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, PhoneCall, Layers } from "lucide-react";
import { useCategoryStore } from "@/lib/store/useCategoryStore";
import { PRODUCT_CATEGORIES } from "@/data/categories";

interface FeaturedProductSectionProps {
  products: ProductWithVariants[];
}

interface CategoryPill {
  slug: string;
  label: string;
  color: string;
}

const CATEGORY_PILLS: CategoryPill[] = [
  {
    slug: "force-standard",
    label: "FORCE Standard",
    color: "#2563eb", // Blue
  },
  {
    slug: "force-elite",
    label: "FORCE Elite",
    color: "#f59e0b", // Amber / Yellow
  },
  {
    slug: "genesis-standard",
    label: "GENESIS Standard",
    color: "#dc2626", // Red
  },
  {
    slug: "all",
    label: "All Products",
    color: "#64748b", // Slate
  },
];

export function FeaturedProductSection({ products }: FeaturedProductSectionProps) {
  const globalCategory = useCategoryStore((s) => s.selectedCategory);
  const setGlobalCategory = useCategoryStore((s) => s.setSelectedCategory);

  // Active category state managed via useState
  const [selectedCategory, setSelectedCategory] = useState<string>(
    globalCategory || "force-standard"
  );

  // Synchronize if global store updates
  useEffect(() => {
    if (globalCategory) {
      setSelectedCategory(globalCategory);
    }
  }, [globalCategory]);

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setGlobalCategory(slug === "all" ? null : (slug as any));
  };

  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === "all") return null;
    return PRODUCT_CATEGORIES.find((c) => c.slug === selectedCategory) || null;
  }, [selectedCategory]);

  // Filter the displayed products based on active category slug
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (selectedCategory === "all") return products;

    return products.filter((product) => {
      const pSlug = String(product?.slug || "").toLowerCase();
      const pBrand = String(product?.brand || "").toLowerCase();
      const pName = String(product?.name || product?.title || "").toLowerCase();
      const pCatId = String((product as any)?.category_id || (product as any)?.categoryId || "");
      const pCatSlug = String((product as any)?.categorySlug || (product as any)?.category_slug || (product as any)?.category?.slug || "");

      const isGenesis =
        pCatId === "b0000000-0000-0000-0000-000000000003" ||
        pCatSlug === "genesis-standard" ||
        pSlug.startsWith("stretch-film-20") ||
        pSlug.includes("20-x-") ||
        pBrand.includes("genesis") ||
        pName.includes("genesis") ||
        pSlug.includes("genesis") ||
        product?.application === "machine";

      const slug =
        (pCatId === "b0000000-0000-0000-0000-000000000003" ? "genesis-standard" : null) ||
        pCatSlug ||
        (isGenesis
          ? pName.includes("hp") || pSlug.includes("hp")
            ? "genesis-high-performance"
            : "genesis-standard"
          : pBrand.includes("elite") || pName.includes("elite") || pSlug.includes("elite")
          ? "force-elite"
          : "force-standard");

      if (selectedCategory === "genesis-standard" || selectedCategory === "b0000000-0000-0000-0000-000000000003") {
        return (
          pCatId === "b0000000-0000-0000-0000-000000000003" ||
          pCatSlug === "genesis-standard" ||
          slug === "genesis-standard" ||
          isGenesis
        );
      }

      return slug === selectedCategory;
    });
  }, [products, selectedCategory]);

  const activePill = useMemo(
    () => CATEGORY_PILLS.find((p) => p.slug === selectedCategory) || CATEGORY_PILLS[0],
    [selectedCategory]
  );

  return (
    <section
      id="product-catalog-section"
      className="py-16 sm:py-20 bg-white border-b border-slate-100 transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10 gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="default"
                className="uppercase text-xs tracking-wider font-bold"
                style={{
                  backgroundColor: `${activePill.color}15`,
                  color: activePill.color,
                  borderColor: `${activePill.color}30`,
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
                ? `Featured ${activeCategoryMeta.name} Series`
                : "Featured Industrial Film Series"}
            </h2>

            <p className="text-sm text-slate-600 max-w-xl leading-relaxed font-normal">
              {activeCategoryMeta
                ? activeCategoryMeta.description
                : "Precision cast polyethylene pallet wrap formulated for maximum containment force and high roll yield."}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all duration-200"
            >
              <span>View Full Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Dynamic Category Pills Navigation */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-8 sm:mb-10">
          {CATEGORY_PILLS.map((pill) => {
            const isActive = selectedCategory === pill.slug;
            return (
              <button
                key={pill.slug}
                type="button"
                onClick={() => handleCategorySelect(pill.slug)}
                className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md ring-2 ring-offset-2 ring-slate-900"
                    : "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {/* Small circular colored dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-200"
                  style={{
                    backgroundColor: pill.color,
                    boxShadow: isActive ? `0 0 8px ${pill.color}` : "none",
                  }}
                />
                <span>{pill.label}</span>
              </button>
            );
          })}
        </div>

        {/* Animated Product Grid with Framer Motion */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            {filteredProducts.length > 0 ? (
              <div
                className={`grid gap-6 ${
                  filteredProducts.length <= 2
                    ? "grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto"
                    : filteredProducts.length === 3
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                }`}
              >
                {filteredProducts.map((product, idx) => (
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
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{
                    backgroundColor: `${activePill.color}15`,
                    color: activePill.color,
                  }}
                >
                  <Layers className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">
                    Need Custom {activeCategoryMeta?.name || "Extrusion"} Specs?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                    We manufacture custom machine film roll widths, gauges, and pre-stretch formulations directly from our extrusion mills for high-volume enterprise operations.
                  </p>
                </div>
                <Link
                  href="#inquiry-form"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 mt-2 transition-all shadow-sm"
                >
                  <PhoneCall className="w-3.5 h-3.5 mr-1 text-sky-600" />
                  <span>Request Custom Specs</span>
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
