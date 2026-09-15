"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  Search,
  Plus,
  Check,
  Pencil,
  Trash2,
  Power,
  PackageX,
  Loader2,
  X,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminProduct } from "@/types/product";
import { deleteProduct, toggleProductActive } from "@/actions/products";
import { ProductFormModal } from "./ProductFormModal";

interface AdminCatalogViewProps {
  initialProducts: AdminProduct[];
  showToast?: (msg: string) => void;
}

type ApplicationFilter = "all" | "hand" | "machine";
type StatusFilter = "all" | "active" | "inactive";

// Extracts a roll length in feet from a product title (e.g. "...X 1000FT" -> 1000)
function extractLengthFeet(name: string): number | null {
  const match = name.match(/(\d{3,5})\s*FT/i);
  return match ? Number(match[1]) : null;
}

const FALLBACK_GAUGES = [50, 60, 70, 80, 90];
const FALLBACK_LENGTHS = [1000, 1500, 5000, 6000];

// Resolves the best available image source across the various field shapes a product row may have
function resolveProductImage(item: AdminProduct): string {
  return item.imageUrl || item.images?.[0] || "";
}

function ProductThumbnail({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-300">
        <PackageX className="w-10 h-10" />
        <span className="text-[10px] font-semibold text-slate-400">No image</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 25vw"
      className="object-contain p-4"
      onError={() => setHasError(true)}
    />
  );
}

export function AdminCatalogView({ initialProducts, showToast }: AdminCatalogViewProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [filterApp, setFilterApp] = useState<ApplicationFilter>("all");
  const [filterGauges, setFilterGauges] = useState<number[]>([]);
  const [filterLength, setFilterLength] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [isGaugeMenuOpen, setIsGaugeMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    if (showToast) {
      showToast(msg);
    } else {
      setLocalToast(msg);
      setTimeout(() => setLocalToast(null), 3500);
    }
  };

  const availableGauges = useMemo(() => {
    const fromData = Array.from(new Set(products.map((p) => p.gauge).filter((g): g is number => !!g)));
    const merged = Array.from(new Set([...fromData, ...FALLBACK_GAUGES]));
    return merged.sort((a, b) => a - b);
  }, [products]);

  const availableLengths = useMemo(() => {
    const fromData = products
      .map((p) => extractLengthFeet(p.name))
      .filter((l): l is number => !!l);
    const merged = Array.from(new Set([...fromData, ...FALLBACK_LENGTHS]));
    return merged.sort((a, b) => a - b);
  }, [products]);

  const hasActiveFilters =
    search.trim() !== "" ||
    filterApp !== "all" ||
    filterGauges.length > 0 ||
    filterLength !== "all" ||
    filterStatus !== "all";

  const filtered = useMemo(() => {
    return products.filter((item) => {
      if (filterApp !== "all" && item.application !== filterApp) return false;
      if (filterStatus === "active" && !item.isActive) return false;
      if (filterStatus === "inactive" && item.isActive) return false;
      if (filterGauges.length > 0 && (!item.gauge || !filterGauges.includes(item.gauge))) return false;
      if (filterLength !== "all" && extractLengthFeet(item.name) !== filterLength) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.partNumber.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [products, search, filterApp, filterGauges, filterLength, filterStatus]);

  const toggleGauge = (gauge: number) => {
    setFilterGauges((prev) =>
      prev.includes(gauge) ? prev.filter((g) => g !== gauge) : [...prev, gauge]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setFilterApp("all");
    setFilterGauges([]);
    setFilterLength("all");
    setFilterStatus("all");
  };

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
  };

  const handleToggleActive = async (product: AdminProduct) => {
    setBusyId(product.id);
    try {
      const result = await toggleProductActive(product.id, !product.isActive);
      if (result.success && result.product) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? result.product! : p)));
        notify(`${product.name} is now ${!product.isActive ? "active" : "inactive"}.`);
      } else {
        notify(result.error || "Failed to update product status.");
      }
    } finally {
      setBusyId(null);
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
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Sticky Filter Toolbar */}
      <div className="sticky top-0 z-20 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-sm shadow-xs">
        <div className="p-4 sm:px-6 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, part number, or description..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-400"
              />
            </div>

            {/* Application Tabs */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
              {(
                [
                  { key: "all", label: "All" },
                  { key: "hand", label: "Hand Stretch Film" },
                  { key: "machine", label: "Automatic / Machine" },
                ] as { key: ApplicationFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterApp(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    filterApp === tab.key
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Gauge Multi-Select */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsGaugeMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                Gauge{filterGauges.length > 0 ? ` (${filterGauges.length})` : ""}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isGaugeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setIsGaugeMenuOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-xl z-40 p-2 space-y-1 max-h-64 overflow-y-auto">
                    {availableGauges.map((g) => (
                      <label
                        key={g}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={filterGauges.includes(g)}
                          onChange={() => toggleGauge(g)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                        {g} GA
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
              className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="active">Active</option>
              <option value="inactive">Draft / Inactive</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-[11px] font-bold hover:bg-red-100 cursor-pointer whitespace-nowrap"
              >
                <X className="w-3.5 h-3.5" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Length Quick Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Length:
            </span>
            <button
              type="button"
              onClick={() => setFilterLength("all")}
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                filterLength === "all"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            {availableLengths.map((len) => (
              <button
                key={len}
                type="button"
                onClick={() => setFilterLength(filterLength === len ? "all" : len)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors cursor-pointer ${
                  filterLength === len
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {len.toLocaleString()} FT
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <p className="text-[11px] font-semibold text-slate-500">
            Showing <span className="text-slate-900 font-bold">{filtered.length}</span> of{" "}
            <span className="text-slate-900 font-bold">{products.length}</span> products
          </p>
        </div>
      </div>

      {/* Catalog Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs py-16 text-center text-slate-400">
          <div className="flex flex-col items-center gap-2">
            <PackageX className="w-8 h-8" />
            <span className="text-xs font-semibold">No products found.</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="relative h-48 bg-slate-50 flex items-center justify-center p-4">
                <ProductThumbnail src={resolveProductImage(item)} alt={item.name} />

                <span className="absolute top-2.5 right-2.5">
                  {item.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-bold">
                      Inactive
                    </span>
                  )}
                </span>
              </div>

              <div className="flex-1 flex flex-col p-4 gap-1.5">
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  {item.partNumber ? `#${item.partNumber}` : "No Part #"}
                </span>
                <h3 className="font-semibold text-gray-800 text-lg leading-snug">{item.name}</h3>
                <p className="line-clamp-2 text-sm text-gray-500">
                  {item.description || "No description provided."}
                </p>

                <div className="flex items-center gap-2 mt-1">
                  {item.gauge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold">
                      {item.gauge} GA
                    </span>
                  )}
                  <span className="capitalize text-[10px] font-semibold text-slate-500">
                    {item.application === "hand" ? "Manual Hand" : "Automated Machine"}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-slate-900">
                    {item.priceUsd !== null ? `${formatCurrency(item.priceUsd)} USD` : "—"}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      item.stockQuantity <= 0 ? "text-red-600" : "text-slate-600"
                    }`}
                  >
                    {item.stockQuantity <= 0 ? "Out of stock" : `${item.stockQuantity} in stock`}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    disabled={busyId === item.id}
                    title={item.isActive ? "Deactivate" : "Activate"}
                    className="p-2 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer disabled:opacity-50"
                  >
                    {busyId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={busyId === item.id}
                    title="Delete product"
                    className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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

