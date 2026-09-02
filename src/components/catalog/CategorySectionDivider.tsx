"use client";

import React from "react";
import Image from "next/image";
import { PRODUCT_CATEGORIES } from "@/data/categories";

export interface CategorySectionDividerProps {
  categorySlug: string;
  categoryName?: string;
  logoUrl?: string;
  accentClass?: string;
  className?: string;
}

const CATEGORY_DIVIDER_CONFIG: Record<
  string,
  {
    ruleBg: string;
    border: string;
    glow: string;
  }
> = {
  "force-standard": {
    ruleBg: "bg-blue-600",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_20px_rgba(37,99,235,0.12)]",
  },
  "force-elite": {
    ruleBg: "bg-amber-500",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_20px_rgba(217,119,6,0.12)]",
  },
  "genesis-standard": {
    ruleBg: "bg-red-600",
    border: "border-red-600/30",
    glow: "shadow-[0_0_20px_rgba(220,38,38,0.12)]",
  },
  "genesis-high-performance": {
    ruleBg: "bg-emerald-600",
    border: "border-emerald-600/30",
    glow: "shadow-[0_0_20px_rgba(22,163,74,0.12)]",
  },
};

export function CategorySectionDivider({
  categorySlug,
  categoryName,
  logoUrl,
  accentClass,
  className = "",
}: CategorySectionDividerProps) {
  const categoryMeta = PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug);
  const config = CATEGORY_DIVIDER_CONFIG[categorySlug] || {
    ruleBg: "bg-sky-600",
    border: "border-sky-500/30",
    glow: "shadow-sm",
  };

  const finalLogo = logoUrl || categoryMeta?.logoUrl;
  const finalName = categoryName || categoryMeta?.name || categorySlug;
  const finalRuleClass = accentClass || config.ruleBg;

  return (
    <div
      className={`w-full flex items-center justify-center my-10 md:my-14 gap-3 sm:gap-4 px-4 ${className}`}
      id={`category-divider-${categorySlug}`}
    >
      {/* Left Horizontal Accent Rule */}
      <div
        className={`flex-1 h-[2px] rounded-full min-w-[16px] sm:min-w-[40px] opacity-90 transition-all ${finalRuleClass}`}
      />

      {/* Center Element: Category SVG Logo in Elegant Card Container */}
      <div className="flex-shrink-0 px-2 flex flex-col items-center">
        {finalLogo ? (
          <div
            className={`p-2.5 sm:p-3 md:p-3.5 rounded-2xl bg-white border ${config.border} ${config.glow} flex items-center justify-center transition-all duration-300 hover:scale-[1.02] shadow-xs`}
          >
            <Image
              src={finalLogo}
              alt={finalName}
              width={260}
              height={70}
              priority
              className="h-12 md:h-16 w-auto object-contain flex-shrink-0 px-1 sm:px-2"
            />
          </div>
        ) : (
          <div className="px-5 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm font-extrabold uppercase tracking-wider text-slate-800 shadow-sm">
            {finalName}
          </div>
        )}
      </div>

      {/* Right Horizontal Accent Rule */}
      <div
        className={`flex-1 h-[2px] rounded-full min-w-[16px] sm:min-w-[40px] opacity-90 transition-all ${finalRuleClass}`}
      />
    </div>
  );
}

