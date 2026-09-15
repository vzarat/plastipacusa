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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminProduct } from "@/types/product";
import { deleteProduct, toggleProductActive } from "@/actions/products";
import { ProductFormModal } from "./ProductFormModal";

interface AdminCatalogViewProps {
  initialProducts: AdminProduct[];
  showToast?: (msg: string) => void;
}

export function AdminCatalogView({ initialProducts, showToast }: AdminCatalogViewProps) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [filterApp, setFilterApp] = useState<string>("all");
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

  const filtered = useMemo(() => {
    return products.filter((item) => {
      if (filterApp !== "all" && item.application !== filterApp) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.partNumber.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, search, filterApp]);

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
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* Catalog Table Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, part number, or slug..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterApp}
              onChange={(e) => setFilterApp(e.target.value)}
              className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Application: All</option>
              <option value="hand">Manual Hand Wrap</option>
              <option value="machine">Machine Automated Film</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Product & Part Number</th>
                <th className="py-3.5 px-3">Application</th>
                <th className="py-3.5 px-3">Gauge</th>
                <th className="py-3.5 px-3">Price</th>
                <th className="py-3.5 px-3">Stock</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <PackageX className="w-8 h-8" />
                      <span className="text-xs font-semibold">No products found.</span>
                    </div>
                  </td>
                </tr>
              )}

              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 p-1 flex-shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={36}
                            height={36}
                            className="h-8 w-auto object-contain"
                          />
                        ) : (
                          <PackageX className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                        <p className="font-mono text-[10px] text-purple-700 font-semibold">
                          {item.partNumber || "No Part #"}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-3">
                    <span className="capitalize font-semibold text-slate-700">
                      {item.application === "hand" ? "Manual Hand" : "Automated Machine"}
                    </span>
                  </td>

                  <td className="py-4 px-3 font-semibold text-slate-800">
                    {item.gauge ? `${item.gauge} GA` : "—"}
                  </td>

                  <td className="py-4 px-3 font-bold text-slate-700">
                    {item.priceUsd !== null ? formatCurrency(item.priceUsd) : "—"}
                  </td>

                  <td className="py-4 px-3">
                    <span
                      className={`font-bold ${
                        item.stockQuantity <= 0 ? "text-red-600" : "text-slate-800"
                      }`}
                    >
                      {item.stockQuantity}
                    </span>
                  </td>

                  <td className="py-4 px-3">
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
                  </td>

                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        title="Edit product"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        disabled={busyId === item.id}
                        title={item.isActive ? "Deactivate" : "Activate"}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer disabled:opacity-50"
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
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

