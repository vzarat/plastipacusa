"use client";

import React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { PRODUCT_CATEGORIES, CategoryItem } from "@/data/categories";
import { useCategoryStore, CategorySlug } from "@/lib/store/useCategoryStore";

interface CategoryShowcaseProps {
  /** Optional controlled active category override */
  activeCategory?: string | null;
  /** Optional selection handler */
  onSelectCategory?: (slug: CategorySlug | null) => void;
  /** Custom container className */
  className?: string;
}

export function CategoryShowcase({
  activeCategory: propActiveCategory,
  onSelectCategory: propOnSelectCategory,
  className = "",
}: CategoryShowcaseProps) {
  const storeCategory = useCategoryStore((s) => s.selectedCategory);
  const storeSetCategory = useCategoryStore((s) => s.setSelectedCategory);

  const currentCategory =
    propActiveCategory !== undefined ? propActiveCategory : storeCategory;

  const handleSelect = (slug: CategorySlug) => {
    // Toggle: click active card to clear back to neutral resting state (all products)
    const nextCategory = currentCategory === slug ? null : slug;
    if (propOnSelectCategory) {
      propOnSelectCategory(nextCategory);
    } else {
      storeSetCategory(nextCategory);
    }
  };

  return (
    <section
      aria-label="Product Category Selector"
      className={`relative py-12 sm:py-16 bg-slate-50/60 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-900 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3">
          <Badge variant="default" className="text-xs uppercase tracking-widest font-bold">
            Engineered Product Lines
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Select Film System & Specification
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Choose between our high-yield manual hand wrap lines and heavy-duty automated machine stretch films.
          </p>
        </div>

        {/* 4 Brand Category Grid (2 cols mobile, 4 cols desktop) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {PRODUCT_CATEGORIES.map((cat: CategoryItem) => {
            const isActive = currentCategory === cat.slug;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.slug as CategorySlug)}
                aria-pressed={isActive}
                aria-label={`Filter by ${cat.name}`}
                className={`group relative rounded-2xl p-6 sm:p-7 text-center transition-all duration-300 ease-out cursor-pointer flex items-center justify-center min-h-[130px] sm:min-h-[150px] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  isActive
                    ? `bg-white dark:bg-slate-900/70 ${cat.activeBorder} ${cat.activeShadow} -translate-y-1.5 scale-[1.02]`
                    : `bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 ${cat.hoverBorder} ${cat.hoverShadow} hover:-translate-y-1.5 hover:scale-[1.02] active:scale-[0.98]`
                }`}
              >
                {/* Large Scaled SVG Logo Display */}
                <div className="relative z-10 w-full flex items-center justify-center py-2 sm:py-3">
                  <Image
                    src={cat.logoUrl}
                    alt={`${cat.name} Logo`}
                    width={280}
                    height={110}
                    priority
                    className="h-20 md:h-24 w-auto object-contain mx-auto transition-transform duration-300 group-hover:scale-105 select-none"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
