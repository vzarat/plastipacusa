"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, PackageOpen } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import {
  ProductFilters,
  type CatalogAppFilter,
} from "@/components/products/ProductFilters";
import { ProductCatalogToolbar } from "@/components/products/ProductCatalogToolbar";
import type { ProductWithVariants } from "@/types";
import {
  SERIES_FORCE_ELITE,
  SERIES_FORCE_STANDARD,
  SERIES_GENESIS_HP,
  SERIES_GENESIS_STANDARD,
  sortProductsByDimensions,
} from "@/lib/products";

export type { CatalogAppFilter };

/** 3 rows × 3 columns on desktop (`lg:grid-cols-3`) */
const ITEMS_PER_PAGE = 9;

interface ProductCatalogProps {
  allProducts: ProductWithVariants[];
  initialApp?: CatalogAppFilter;
  initialCategory?: string;
  initialWidth?: string;
  initialGauge?: string;
  initialLength?: string;
  initialQuery?: string;
}

const CATEGORY_SERIES_MAP: Record<string, string> = {
  "force-standard": SERIES_FORCE_STANDARD,
  "force-elite": SERIES_FORCE_ELITE,
  "genesis-standard": SERIES_GENESIS_STANDARD,
  "genesis-high-performance": SERIES_GENESIS_HP,
};

function matchesCategory(
  product: ProductWithVariants,
  categorySlug: string
): boolean {
  const key = categorySlug.toLowerCase();
  if (!key || key === "all") return true;
  if (String(product.categorySlug || "").toLowerCase() === key) return true;
  const series = CATEGORY_SERIES_MAP[key];
  if (series && product.series === series) return true;
  return false;
}

function matchesWidth(product: ProductWithVariants, targetWidth: number): boolean {
  const productWidth = Number(product.widthInches ?? product.width_inches);
  if (Number.isFinite(productWidth) && Math.round(productWidth) === targetWidth) {
    return true;
  }

  return (product.variants || []).some((v) => {
    const w = Number(v.widthInches);
    return Number.isFinite(w) && Math.round(w) === targetWidth;
  });
}

function parseLengthFeet(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(/,/g, "").replace(/\s*ft\b\.?/i, "").trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function matchesLength(
  product: ProductWithVariants,
  targetLength: number
): boolean {
  const productLength = parseLengthFeet(
    product.length_feet ?? (product as { lengthFeet?: number | string }).lengthFeet
  );
  if (productLength !== null && productLength === targetLength) {
    return true;
  }

  if (
    (product.variants || []).some((v) => {
      const variantLength = parseLengthFeet(v.lengthFeet);
      return variantLength !== null && variantLength === targetLength;
    })
  ) {
    return true;
  }

  const slug = String(product.slug || "").toLowerCase();
  return slug.includes(`x-${targetLength}ft`) || slug.endsWith(`-${targetLength}ft`);
}

function matchesGauge(product: ProductWithVariants, targetGauge: number): boolean {
  if (product.gauge === targetGauge) return true;
  return (product.variants || []).some((v) => v?.gauge === targetGauge);
}

function excludeFiftyGauge(product: ProductWithVariants): boolean {
  if (product?.gauge === 50) return false;
  const slug = String(product?.slug || "").toLowerCase();
  if (slug.includes("50-ga") || slug.includes("-50ga")) return false;
  const label = `${product?.title || ""} ${product?.name || ""}`.toLowerCase();
  if (/\b50\s*ga(uge)?\b/.test(label)) return false;
  return true;
}

function CatalogPagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Product catalog pages"
      className="flex flex-wrap items-center justify-center gap-2 pt-8"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        Prev
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? "page" : undefined}
          className={`min-w-[2.25rem] rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
            page === currentPage
              ? "bg-sky-600 text-white shadow-sm shadow-sky-600/25"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        aria-label="Next page"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

export function ProductCatalog({
  allProducts,
  initialApp = "all",
  initialCategory = "all",
  initialWidth = "all",
  initialGauge = "all",
  initialLength = "all",
  initialQuery = "",
}: ProductCatalogProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedAppType, setSelectedAppType] =
    useState<CatalogAppFilter>(initialApp);
  const [selectedCategory] = useState(initialCategory);
  const [selectedWidth, setSelectedWidth] = useState(initialWidth);
  const [selectedGauge, setSelectedGauge] = useState(initialGauge);
  const [selectedLength, setSelectedLength] = useState(initialLength);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);
  const gridTopRef = useRef<HTMLDivElement>(null);

  const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
    startTransition(() => {
      setter(value);
      setCurrentPage(1);
    });
  };

  const resetFilters = () => {
    startTransition(() => {
      setSelectedAppType("all");
      setSelectedWidth("all");
      setSelectedGauge("all");
      setSelectedLength("all");
      setSearchQuery("");
      setCurrentPage(1);
    });
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = allProducts
      .filter(excludeFiftyGauge)
      .map((p) => ({
        ...p,
        variants: (p.variants || []).filter((v) => Number(v.gauge) !== 50),
      }))
      .filter((product) => {
        if (
          selectedCategory &&
          selectedCategory !== "all" &&
          !matchesCategory(product, selectedCategory)
        ) {
          return false;
        }

        if (selectedAppType !== "all" && product.application !== selectedAppType) {
          return false;
        }

        if (selectedWidth !== "all") {
          const targetWidth = parseInt(selectedWidth, 10);
          if (
            Number.isFinite(targetWidth) &&
            !matchesWidth(product, targetWidth)
          ) {
            return false;
          }
        }

        if (selectedGauge !== "all") {
          const targetGauge = parseInt(selectedGauge, 10);
          if (
            Number.isFinite(targetGauge) &&
            !matchesGauge(product, targetGauge)
          ) {
            return false;
          }
        }

        if (selectedLength !== "all") {
          const targetLength = parseInt(selectedLength, 10);
          if (
            Number.isFinite(targetLength) &&
            !matchesLength(product, targetLength)
          ) {
            return false;
          }
        }

        if (q) {
          const haystack = [
            product?.title,
            product?.name,
            product?.description,
            product?.shortDescription,
            product?.brand,
            product?.slug,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        return true;
      });

    return sortProductsByDimensions(filtered);
  }, [
    allProducts,
    selectedCategory,
    selectedAppType,
    selectedWidth,
    selectedGauge,
    selectedLength,
    searchQuery,
  ]);

  // Auto-reset page when filters/search change (covers toolbar typing too)
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCategory,
    selectedAppType,
    selectedWidth,
    selectedGauge,
    selectedLength,
    searchQuery,
  ]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
    const next = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(next);
    const gridTop = gridTopRef.current?.getBoundingClientRect().top;
    const scrollY =
      typeof window !== "undefined" && gridTop !== undefined
        ? window.scrollY + gridTop - 96
        : 0;
    window.scrollTo({ top: Math.max(0, scrollY), behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <ProductCatalogToolbar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSubmitSearch={(value) => {
          startTransition(() => {
            setSearchQuery(value);
            setCurrentPage(1);
          });
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3">
          <ProductFilters
            selectedApp={selectedAppType}
            selectedWidth={selectedWidth}
            selectedGauge={selectedGauge}
            selectedLength={selectedLength}
            onAppChange={(value) => updateFilter(setSelectedAppType, value)}
            onWidthChange={(value) => updateFilter(setSelectedWidth, value)}
            onGaugeChange={(value) => updateFilter(setSelectedGauge, value)}
            onLengthChange={(value) => updateFilter(setSelectedLength, value)}
            onReset={resetFilters}
          />
        </div>

        <div
          ref={gridTopRef}
          className={`lg:col-span-9 transition-opacity duration-150 ${
            isPending ? "opacity-70" : "opacity-100"
          }`}
        >
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-sm">
              <PackageOpen className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">No products found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No stretch film matched the selected application, gauge, length, or
                width criteria. Try resetting your filters.
              </p>
            </div>
          ) : (
            <>
              <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                <AnimatePresence mode="popLayout">
                  {paginatedProducts.map((product, idx) => (
                    <motion.div
                      key={product?.id ?? product?.slug ?? idx}
                      layout
                      initial={{ opacity: 0, scale: 0.96, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -10 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="h-full"
                    >
                      <ProductCard product={product} priority={idx < 3} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              <CatalogPagination
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
