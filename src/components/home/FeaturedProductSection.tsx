"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ProductWithVariants } from "@/types";
import { ProductCard } from "@/components/products/ProductCard";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { useCategoryStore, type CategorySlug } from "@/lib/store/useCategoryStore";
import { PRODUCT_CATEGORIES } from "@/data/categories";
import {
  isGenesisHighPerformanceProduct,
  isGenesisStandardProduct,
} from "@/lib/products";

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
    color: "#2563eb",
  },
  {
    slug: "force-elite",
    label: "FORCE Elite",
    color: "#f59e0b",
  },
  {
    slug: "genesis-high-performance",
    label: "GENESIS Automatic",
    color: "#16a34a",
  },
  {
    slug: "all",
    label: "All Products",
    color: "#64748b",
  },
];

function matchesFeaturedCategory(
  product: ProductWithVariants,
  selectedCategory: string
): boolean {
  const rawWidth = product?.widthInches ?? product?.width_inches ?? 0;
  const width =
    typeof rawWidth === "number" ? rawWidth : parseFloat(String(rawWidth)) || 0;
  const slug = String(product?.slug || "").toLowerCase();
  const title = String(product?.title || product?.name || "").toLowerCase();
  const catSlug = String(product?.categorySlug || "").toLowerCase();

  if (
    selectedCategory === "genesis-high-performance" ||
    selectedCategory === "machine-high-yield-film"
  ) {
    return isGenesisHighPerformanceProduct(product);
  }

  if (
    selectedCategory === "genesis-standard" ||
    selectedCategory === "b0000000-0000-0000-0000-000000000003"
  ) {
    return isGenesisStandardProduct(product);
  }

  if (selectedCategory === "force-elite") {
    if (isGenesisHighPerformanceProduct(product) || isGenesisStandardProduct(product)) {
      return false;
    }
    return (
      width === 15 ||
      catSlug === "force-elite" ||
      slug.includes("15-x") ||
      title.includes('15"') ||
      slug.includes("elite") ||
      title.includes("elite")
    );
  }

  if (selectedCategory === "force-standard") {
    if (isGenesisHighPerformanceProduct(product) || isGenesisStandardProduct(product)) {
      return false;
    }
    const isElite =
      width === 15 ||
      slug.includes("15-x") ||
      title.includes('15"') ||
      slug.includes("elite") ||
      catSlug === "force-elite";
    return !isElite;
  }

  return false;
}

export function FeaturedProductSection({ products }: FeaturedProductSectionProps) {
  const globalCategory = useCategoryStore((s) => s.selectedCategory);
  const setGlobalCategory = useCategoryStore((s) => s.setSelectedCategory);

  const [selectedCategory, setSelectedCategory] = useState<string>(
    globalCategory || "force-standard"
  );

  useEffect(() => {
    if (globalCategory) {
      setSelectedCategory(globalCategory);
    }
  }, [globalCategory]);

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    setGlobalCategory(slug === "all" ? null : (slug as CategorySlug));
  };

  const activeCategoryMeta = useMemo(() => {
    if (selectedCategory === "all") return null;
    return PRODUCT_CATEGORIES.find((c) => c.slug === selectedCategory) || null;
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (selectedCategory === "all") return products;
    return products.filter((p) => matchesFeaturedCategory(p, selectedCategory));
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
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-10 gap-6">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider"
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

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-8 sm:mb-10">
          {CATEGORY_PILLS.map((pill) => {
            const isActive = selectedCategory === pill.slug;
            return (
              <button
                key={pill.slug}
                type="button"
                onClick={() => handleCategorySelect(pill.slug)}
                className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm border ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
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

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
          >
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((product, idx) => (
                  <ProductCard
                    key={product?.slug || product?.id || idx}
                    product={product}
                    priority={idx < 4}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-slate-500 py-12">
                No products in this series yet.
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
