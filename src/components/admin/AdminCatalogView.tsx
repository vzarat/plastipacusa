"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  Search,
  Plus,
  Check,
  Pencil,
  Trash2,
  PackageX,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminProduct } from "@/types/product";
import { STRETCH_FILM_PLACEHOLDER } from "@/lib/products";
import { deleteProduct, toggleProductActive } from "@/actions/products";
import { ProductFormModal } from "./ProductFormModal";

interface AdminCatalogViewProps {
  initialProducts: AdminProduct[];
  showToast?: (msg: string) => void;
}

type ApplicationFilter = "all" | "hand" | "machine";
type StatusFilter = "all" | "active" | "inactive";
type SpecFilter = number | "all";

const CATALOG_WIDTHS = [15, 18, 20, 30];
const CATALOG_GAUGES = [60, 70, 80];
const CATALOG_LENGTHS = [1000, 1500, 5000, 6000];

// Resolves the best available image source across the various field shapes a product row may have
function formatSpecInches(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function roundedSpec(value: number | null | undefined): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function uniqueSorted(values: Array<number | null>): number[] {
  return Array.from(new Set(values.filter((value): value is number => value != null))).sort(
    (a, b) => a - b
  );
}

function specNumber(value: number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function compareProductsBySpecs(a: AdminProduct, b: AdminProduct): number {
  return (
    specNumber(a.widthInches) - specNumber(b.widthInches) ||
    specNumber(a.gauge) - specNumber(b.gauge) ||
    specNumber(a.lengthFeet) - specNumber(b.lengthFeet)
  );
}

function specBadgesFor(item: AdminProduct, labels: { hand: string; machine: string }): string[] {
  const badges: string[] = [];
  if (item.widthInches) badges.push(`${formatSpecInches(item.widthInches)} IN`);
  if (item.gauge) badges.push(`${item.gauge} GA`);
  if (item.lengthFeet) badges.push(`${item.lengthFeet.toLocaleString("en-US")} FT`);
  if (item.application === "hand") badges.push(labels.hand);
  else if (item.application === "machine") badges.push(labels.machine);
  return badges;
}

function resolveProductImage(item: AdminProduct): string {
  return item.imageUrl || item.images?.[0] || STRETCH_FILM_PLACEHOLDER;
}

function ProductThumbnail({ src, alt }: { src: string; alt: string }) {
  const [currentSrc, setCurrentSrc] = useState(src || STRETCH_FILM_PLACEHOLDER);

  useEffect(() => {
    setCurrentSrc(src || STRETCH_FILM_PLACEHOLDER);
  }, [src]);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 25vw"
      className="object-contain p-4"
      onError={() => {
        if (currentSrc !== STRETCH_FILM_PLACEHOLDER) {
          setCurrentSrc(STRETCH_FILM_PLACEHOLDER);
        }
      }}
    />
  );
}

const PAGE_SIZE = 12;

export function AdminCatalogView({ initialProducts, showToast }: AdminCatalogViewProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [filterApp, setFilterApp] = useState<ApplicationFilter>("all");
  const [filterWidth, setFilterWidth] = useState<SpecFilter>("all");
  const [filterGauge, setFilterGauge] = useState<SpecFilter>("all");
  const [filterLength, setFilterLength] = useState<SpecFilter>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = PAGE_SIZE;

  const notify = (msg: string) => {
    if (showToast) {
      showToast(msg);
    } else {
      setLocalToast(msg);
      setTimeout(() => setLocalToast(null), 3500);
    }
  };

  const availableWidths = useMemo(
    () => uniqueSorted([...products.map((item) => roundedSpec(item.widthInches)), ...CATALOG_WIDTHS]),
    [products]
  );
  const availableGauges = useMemo(
    () => uniqueSorted([...products.map((item) => roundedSpec(item.gauge)), ...CATALOG_GAUGES]),
    [products]
  );
  const availableLengths = useMemo(
    () => uniqueSorted([...products.map((item) => roundedSpec(item.lengthFeet)), ...CATALOG_LENGTHS]),
    [products]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    filterApp !== "all" ||
    filterWidth !== "all" ||
    filterGauge !== "all" ||
    filterLength !== "all" ||
    filterStatus !== "all";

  const filtered = useMemo(() => {
    return products.filter((item) => {
      if (filterApp !== "all" && item.application !== filterApp) return false;
      if (filterStatus === "active" && !item.isActive) return false;
      if (filterStatus === "inactive" && item.isActive) return false;
      if (filterWidth !== "all" && roundedSpec(item.widthInches) !== filterWidth) return false;
      if (filterGauge !== "all" && roundedSpec(item.gauge) !== filterGauge) return false;
      if (filterLength !== "all" && roundedSpec(item.lengthFeet) !== filterLength) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.partNumber.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    }).sort(compareProductsBySpecs);
  }, [products, search, filterApp, filterWidth, filterGauge, filterLength, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const pagedProducts = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterApp, filterWidth, filterGauge, filterLength, filterStatus]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const clearFilters = () => {
    setSearch("");
    setFilterApp("all");
    setFilterWidth("all");
    setFilterGauge("all");
    setFilterLength("all");
    setFilterStatus("all");
  };

  const specChipClass = (active: boolean) =>
    active
      ? "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
      : "rounded-lg border border-transparent bg-slate-100/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:bg-slate-200/80";

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: AdminProduct) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaved = (product: AdminProduct, isNew: boolean) => {
    setProducts((prev) =>
      isNew ? [product, ...prev] : prev.map((p) => (p.id === product.id ? product : p))
    );
    router.refresh();
  };

  const handleToggleActive = async (product: AdminProduct) => {
    const nextActive = !product.isActive;
    setProducts((prev) =>
      prev.map((item) => (item.id === product.id ? { ...item, isActive: nextActive } : item))
    );

    try {
      const result = await toggleProductActive(product.id, nextActive);
      if (!result.success) {
        setProducts((prev) =>
          prev.map((item) =>
            item.id === product.id ? { ...item, isActive: product.isActive } : item
          )
        );
        notify(result.error || "Failed to update product status.");
        return;
      }
      router.refresh();
    } catch {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, isActive: product.isActive } : item
        )
      );
    }
  };

  const handleDelete = async (product: AdminProduct) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    setBusyId(product.id);
    try {
      const result = await deleteProduct(product.id);
      if (result.success) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        notify(`${product.name} deleted.`);
        router.refresh();
      } else {
        notify(result.error || "Failed to delete product.");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {localToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{localToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{t("admin.catalog")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("admin.catalog")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">{t("admin.manageCatalog")}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("admin.addProduct")}</span>
          </Button>
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.searchCatalog")}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
            />
            {search.trim() !== "" && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 overflow-x-auto bg-slate-100 p-1 rounded-xl">
              {(
                [
                  { key: "all", label: t("admin.all") },
                  { key: "hand", label: t("admin.handFilm") },
                  { key: "machine", label: t("admin.machineFilm") },
                ] as { key: ApplicationFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterApp(tab.key)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-all duration-200 ${
                    filterApp === tab.key
                      ? "bg-white shadow-xs text-blue-600 font-semibold"
                      : "font-medium text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
              className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none"
            >
              <option value="all">{t("admin.statusAll")}</option>
              <option value="active">{t("admin.active")}</option>
              <option value="inactive">{t("admin.draftInactive")}</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
              >
                {t("admin.clearFilters")}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {(
            [
              {
                label: t("products.filmWidth"),
                value: filterWidth,
                options: availableWidths,
                format: (value: number) => `${value}"`,
                onChange: setFilterWidth,
              },
              {
                label: t("products.targetGauge"),
                value: filterGauge,
                options: availableGauges,
                format: (value: number) => `${value} GA`,
                onChange: setFilterGauge,
              },
              {
                label: t("products.rollLength"),
                value: filterLength,
                options: availableLengths,
                format: (value: number) => `${value.toLocaleString("en-US")} FT`,
                onChange: setFilterLength,
              },
            ] as const
          ).map((group) => (
            <div key={group.label} className="flex flex-wrap items-center gap-2">
              <span className="mr-1 w-28 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </span>
              <button
                type="button"
                onClick={() => group.onChange("all")}
                className={specChipClass(group.value === "all")}
              >
                {t("admin.all")}
              </button>
              {group.options.map((option) => {
                const active = group.value === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => group.onChange(active ? "all" : option)}
                    className={specChipClass(active)}
                  >
                    {group.format(option)}
                  </button>
                );
              })}
            </div>
          ))}
          <p className="text-xs font-medium text-slate-500">
            {t("admin.showing")} {filtered.length} {t("admin.of")} {products.length}{" "}
            {t("admin.productsCount")}
          </p>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {search.trim() !== "" && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                <span className="max-w-[12rem] truncate">&ldquo;{search.trim()}&rdquo;</span>
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
            {filterApp !== "all" && (
              <button
                type="button"
                onClick={() => setFilterApp("all")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                {filterApp === "hand" ? t("admin.handFilm") : t("admin.machineFilm")}
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
            {filterWidth !== "all" && (
              <button
                type="button"
                onClick={() => setFilterWidth("all")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                {filterWidth}&quot;
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
            {filterGauge !== "all" && (
              <button
                type="button"
                onClick={() => setFilterGauge("all")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                {filterGauge} GA
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
            {filterLength !== "all" && (
              <button
                type="button"
                onClick={() => setFilterLength("all")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                {Number(filterLength).toLocaleString("en-US")} FT
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
            {filterStatus !== "all" && (
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                {filterStatus === "active" ? t("admin.active") : t("admin.draftInactive")}
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Catalog Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs py-16 text-center text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <PackageX className="w-8 h-8" />
            <span className="text-xs font-semibold">{t("admin.noProducts")}</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
              >
                {t("admin.clearFilters")}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pagedProducts.map((item) => (
            <div
              key={item.id}
              className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-shadow hover:shadow-md"
            >
              <div className="relative flex h-48 items-center justify-center bg-slate-50 p-4">
                <ProductThumbnail src={resolveProductImage(item)} alt={item.name} />

                <span className="absolute top-2.5 right-2.5">
                  {item.isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      <Check className="h-3 w-3 text-emerald-600" />
                      {t("admin.active")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                      {t("admin.inactive")}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div className="flex flex-col gap-1.5">
                  <span className="truncate text-xs uppercase tracking-wide text-gray-400">
                    {item.partNumber ? `#${item.partNumber}` : t("admin.noPartNumber")}
                  </span>
                  <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-gray-800">
                    {item.name}
                  </h3>
                  <p className="line-clamp-2 text-sm text-gray-500">
                    {item.description || t("admin.noDescription")}
                  </p>

                  <div className="mt-1 flex max-h-6 flex-wrap gap-1.5 overflow-hidden">
                    {specBadgesFor(item, {
                      hand: t("admin.specHand"),
                      machine: t("admin.specMachine"),
                    }).map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {item.priceUsd !== null ? `${formatCurrency(item.priceUsd)} USD` : "—"}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        item.isSoldOut ? "text-red-600" : "text-emerald-700"
                      }`}
                    >
                      {item.isSoldOut ? t("admin.soldOut") : t("admin.inStock")}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("admin.edit")}
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.isActive}
                    onClick={() => handleToggleActive(item)}
                    disabled={busyId === item.id}
                    title={item.isActive ? t("admin.deactivate") : t("admin.activate")}
                    className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
                      item.isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    {busyId === item.id ? (
                      <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin text-white" />
                    ) : (
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          item.isActive ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                    title={t("admin.deleteProduct")}
                    className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <nav
          className="flex flex-col items-center gap-3 pt-2"
          aria-label="Catalog pagination"
        >
          <p className="text-xs font-semibold text-slate-500">
            {`Page ${page} of ${totalPages}`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setCurrentPage(pageNumber)}
                aria-current={pageNumber === page ? "page" : undefined}
                className={`h-8 min-w-8 cursor-pointer rounded-lg px-2 text-xs font-bold ${
                  pageNumber === page
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </nav>
      )}

      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSaved={handleSaved}
        showToast={notify}
      />
    </div>
  );
}

