"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  initialPage?: number;
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

function normalizeApp(raw: string | null | undefined): CatalogAppFilter {
  const value = raw || "all";
  return (["all", "hand", "machine"].includes(value)
    ? value
    : "all") as CatalogAppFilter;
}

function normalizePage(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? raw : Number(raw || "1");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function buildCatalogHref(input: {
  pathname: string;
  app: CatalogAppFilter;
  category: string;
  width: string;
  gauge: string;
  length: string;
  q: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (input.app && input.app !== "all") params.set("app", input.app);
  if (input.category && input.category !== "all") {
    params.set("category", input.category);
  }
  if (input.width && input.width !== "all") params.set("width", input.width);
  if (input.gauge && input.gauge !== "all") params.set("gauge", input.gauge);
  if (input.length && input.length !== "all") params.set("length", input.length);
  if (input.q.trim()) params.set("q", input.q.trim());
  if (input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `${input.pathname}?${qs}` : input.pathname;
}

function catalogStateKey(input: {
  app: CatalogAppFilter;
  category: string;
  width: string;
  gauge: string;
  length: string;
  q: string;
  page: number;
}): string {
  return [
    input.app,
    input.category,
    input.width,
    input.gauge,
    input.length,
    input.q.trim(),
    String(input.page),
  ].join("|");
}

function CatalogPagination({
  currentPage,
  totalPages,
  hrefForPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav
      aria-label="Product catalog pages"
      className="flex flex-wrap items-center justify-center gap-2 pt-8"
    >
      {currentPage <= 1 ? (
        <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400 opacity-40">
          <ChevronLeft className="w-4 h-4" />
          Prev
        </span>
      ) : (
        <Link
          href={hrefForPage(currentPage - 1)}
          onClick={(e) => {
            e.preventDefault();
            onPageChange(currentPage - 1);
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          aria-label="Previous page"
          rel="prev"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </Link>
      )}

      {pages.map((page) => (
        <Link
          key={page}
          href={hrefForPage(page)}
          onClick={(e) => {
            e.preventDefault();
            onPageChange(page);
          }}
          aria-current={page === currentPage ? "page" : undefined}
          className={`min-w-[2.25rem] rounded-xl px-3 py-2 text-xs font-bold transition-colors text-center ${
            page === currentPage
              ? "bg-sky-600 text-white shadow-sm shadow-sky-600/25"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {page}
        </Link>
      ))}

      {currentPage >= totalPages ? (
        <span className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400 opacity-40">
          Next
          <ChevronRight className="w-4 h-4" />
        </span>
      ) : (
        <Link
          href={hrefForPage(currentPage + 1)}
          onClick={(e) => {
            e.preventDefault();
            onPageChange(currentPage + 1);
          }}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          aria-label="Next page"
          rel="next"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
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
  initialPage = 1,
}: ProductCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedAppType, setSelectedAppType] =
    useState<CatalogAppFilter>(initialApp);
  const [selectedCategory] = useState(initialCategory);
  const [selectedWidth, setSelectedWidth] = useState(initialWidth);
  const [selectedGauge, setSelectedGauge] = useState(initialGauge);
  const [selectedLength, setSelectedLength] = useState(initialLength);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(Math.max(1, initialPage));
  const gridTopRef = useRef<HTMLDivElement>(null);
  const lastPushedKeyRef = useRef(
    catalogStateKey({
      app: initialApp,
      category: initialCategory,
      width: initialWidth,
      gauge: initialGauge,
      length: initialLength,
      q: initialQuery,
      page: Math.max(1, initialPage),
    })
  );

  const pushCatalogUrl = useCallback(
    (
      next: {
        app: CatalogAppFilter;
        category: string;
        width: string;
        gauge: string;
        length: string;
        q: string;
        page: number;
      },
      replace = true
    ) => {
      const key = catalogStateKey(next);
      if (key === lastPushedKeyRef.current) return;
      lastPushedKeyRef.current = key;
      const href = buildCatalogHref({ pathname, ...next });
      const method = replace ? router.replace : router.push;
      method(href, { scroll: false });
    },
    [pathname, router]
  );

  const applyCatalogState = useCallback(
    (
      next: {
        app: CatalogAppFilter;
        category: string;
        width: string;
        gauge: string;
        length: string;
        q: string;
        page: number;
      },
      opts?: { replace?: boolean; scrollToGrid?: boolean }
    ) => {
      startTransition(() => {
        setSelectedAppType(next.app);
        setSelectedWidth(next.width);
        setSelectedGauge(next.gauge);
        setSelectedLength(next.length);
        setSearchQuery(next.q);
        setCurrentPage(next.page);
      });
      pushCatalogUrl(next, opts?.replace ?? true);

      if (opts?.scrollToGrid) {
        const gridTop = gridTopRef.current?.getBoundingClientRect().top;
        const scrollY =
          typeof window !== "undefined" && gridTop !== undefined
            ? window.scrollY + gridTop - 96
            : 0;
        window.scrollTo({ top: Math.max(0, scrollY), behavior: "smooth" });
      }
    },
    [pushCatalogUrl]
  );

  // Sync from URL on back/forward (or external query changes)
  useEffect(() => {
    const fromUrl = {
      app: normalizeApp(searchParams.get("app") || searchParams.get("type")),
      category: searchParams.get("category") || selectedCategory || "all",
      width: searchParams.get("width") || "all",
      gauge: searchParams.get("gauge") || "all",
      length: searchParams.get("length") || "all",
      q: searchParams.get("q") || "",
      page: normalizePage(searchParams.get("page")),
    };
    const key = catalogStateKey(fromUrl);
    if (key === lastPushedKeyRef.current) return;

    lastPushedKeyRef.current = key;
    setSelectedAppType(fromUrl.app);
    setSelectedWidth(fromUrl.width);
    setSelectedGauge(fromUrl.gauge);
    setSelectedLength(fromUrl.length);
    setSearchQuery(fromUrl.q);
    setCurrentPage(fromUrl.page);
    // selectedCategory is intentionally sticky from server props
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to URL changes
  }, [searchParams]);

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

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) {
      applyCatalogState(
        {
          app: selectedAppType,
          category: selectedCategory,
          width: selectedWidth,
          gauge: selectedGauge,
          length: selectedLength,
          q: searchQuery,
          page: totalPages,
        },
        { replace: true }
      );
    }
  }, [
    applyCatalogState,
    currentPage,
    searchQuery,
    selectedAppType,
    selectedCategory,
    selectedGauge,
    selectedLength,
    selectedWidth,
    totalPages,
  ]);

  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const hrefForPage = (page: number) =>
    buildCatalogHref({
      pathname,
      app: selectedAppType,
      category: selectedCategory,
      width: selectedWidth,
      gauge: selectedGauge,
      length: selectedLength,
      q: searchQuery,
      page,
    });

  const currentSnapshot = {
    app: selectedAppType,
    category: selectedCategory,
    width: selectedWidth,
    gauge: selectedGauge,
    length: selectedLength,
    q: searchQuery,
  };

  const updateFilter = <T extends string>(
    key: "app" | "width" | "gauge" | "length" | "q",
    value: T
  ) => {
    applyCatalogState(
      {
        ...currentSnapshot,
        [key]: value,
        page: 1,
      },
      { replace: true }
    );
  };

  const resetFilters = () => {
    applyCatalogState(
      {
        app: "all",
        category: selectedCategory,
        width: "all",
        gauge: "all",
        length: "all",
        q: "",
        page: 1,
      },
      { replace: true }
    );
  };

  const goToPage = (page: number) => {
    const next = Math.max(1, Math.min(page, totalPages));
    applyCatalogState(
      {
        ...currentSnapshot,
        page: next,
      },
      { replace: false, scrollToGrid: true }
    );
  };

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = (value: string) => {
    startTransition(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    });

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      pushCatalogUrl(
        {
          app: selectedAppType,
          category: selectedCategory,
          width: selectedWidth,
          gauge: selectedGauge,
          length: selectedLength,
          q: value,
          page: 1,
        },
        true
      );
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-6">
      <ProductCatalogToolbar
        query={searchQuery}
        onQueryChange={handleQueryChange}
        onSubmitSearch={(value) => {
          if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
          updateFilter("q", value);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-3">
          <ProductFilters
            selectedApp={selectedAppType}
            selectedWidth={selectedWidth}
            selectedGauge={selectedGauge}
            selectedLength={selectedLength}
            onAppChange={(value) => updateFilter("app", value)}
            onWidthChange={(value) => updateFilter("width", value)}
            onGaugeChange={(value) => updateFilter("gauge", value)}
            onLengthChange={(value) => updateFilter("length", value)}
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
                hrefForPage={hrefForPage}
                onPageChange={goToPage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
