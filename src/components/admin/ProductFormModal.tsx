"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  X,
  UploadCloud,
  Loader2,
  Star,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
} from "@/actions/products";
import { AdminProduct, GAUGE_OPTIONS, PACKAGE_TIER_DEFAULTS, ProductFormValues } from "@/types/product";
import { PRODUCT_CATEGORIES, getApplicationForCategory } from "@/data/categories";
import { useLanguage } from "@/context/LanguageContext";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: AdminProduct | null;
  onSaved: (product: AdminProduct, isNew: boolean) => void;
  showToast: (msg: string) => void;
}

const DEFAULT_CATEGORY_SLUG = PRODUCT_CATEGORIES[0]?.slug || "force-standard";

const EMPTY_FORM: ProductFormValues = {
  name: "",
  storefrontTitle: "",
  partNumber: "",
  description: "",
  gauge: GAUGE_OPTIONS[0],
  priceUsd: null,
  priceCase: null,
  priceHalfPallet: null,
  pricePallet: null,
  price6Rolls: PACKAGE_TIER_DEFAULTS.price6Rolls,
  price12Rolls: PACKAGE_TIER_DEFAULTS.price12Rolls,
  price20Rolls: PACKAGE_TIER_DEFAULTS.price20Rolls,
  price40Rolls: PACKAGE_TIER_DEFAULTS.price40Rolls,
  stockQuantity: 0,
  isSoldOut: false,
  application: getApplicationForCategory(DEFAULT_CATEGORY_SLUG),
  categorySlug: DEFAULT_CATEGORY_SLUG,
  imageUrl: "",
  images: [],
  isActive: true,
};

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  onSaved,
  showToast,
}: ProductFormModalProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (product) {
      setForm({
        id: product.id,
        name: product.name,
        storefrontTitle: product.storefrontTitle || "",
        partNumber: product.partNumber || "",
        description: product.description || "",
        gauge: product.gauge,
        priceUsd: product.priceUsd,
        priceCase: product.priceCase,
        priceHalfPallet: product.priceHalfPallet,
        pricePallet: product.pricePallet,
        price6Rolls: product.price6Rolls,
        price12Rolls: product.price12Rolls,
        price20Rolls: product.price20Rolls,
        price40Rolls: product.price40Rolls,
        stockQuantity: product.stockQuantity,
        isSoldOut: Boolean(product.isSoldOut),
        application: getApplicationForCategory(product.categorySlug),
        categorySlug: product.categorySlug,
        imageUrl: product.imageUrl,
        images: product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [],
        isActive: product.isActive,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [isOpen, product]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the dialog container without scrolling the parent page
    requestAnimationFrame(() => {
      dialogRef.current?.focus({ preventScroll: true });
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await uploadProductImage(fd);

      if (result.success && result.url) {
        setForm((prev) => ({
          ...prev,
          images: [...prev.images, result.url as string],
          imageUrl: prev.imageUrl || (result.url as string),
        }));
        showToast("Image uploaded successfully.");
      } else {
        showToast(result.error || "Failed to upload image.");
      }
    } catch (err) {
      showToast("Unexpected error uploading image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (url: string) => {
    setForm((prev) => {
      const images = prev.images.filter((img) => img !== url);
      return {
        ...prev,
        images,
        imageUrl: prev.imageUrl === url ? images[0] || "" : prev.imageUrl,
      };
    });
  };

  const handleSetPrimary = (url: string) => {
    setForm((prev) => ({ ...prev, imageUrl: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast("Product name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const result = product
        ? await updateProduct(product.id, form)
        : await createProduct(form);

      if (result.success && result.product) {
        showToast(product ? "Product updated successfully." : "Product created successfully.");
        onSaved(result.product, !product);
        onClose();
      } else {
        showToast(result.error || "Failed to save product.");
      }
    } catch (err) {
      showToast("Unexpected error saving product.");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-[95vw] max-w-lg md:max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden outline-none p-0 sm:p-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between shrink-0 p-6 border-b">
          <h2 className="text-lg font-black text-slate-900">
            {product ? t("admin.editProduct") : t("admin.addNewProduct")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("admin.productTitle")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder='e.g. FORCE Standard 18" Hand Stretch Film'
                required
                autoFocus={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("admin.partNumber")}
              </label>
              <Input
                value={form.partNumber}
                onChange={(e) => setForm((p) => ({ ...p, partNumber: e.target.value }))}
                placeholder="e.g. FRC-1880-CS"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t("admin.storefrontTitle")}
            </label>
            <Input
              value={form.storefrontTitle}
              onChange={(e) => setForm((p) => ({ ...p, storefrontTitle: e.target.value }))}
              placeholder='e.g. Stretch Film 20" x 60 GA x 5,000 FT'
            />
            <p className="text-[10px] text-slate-400 mt-1">
              {t("admin.storefrontHint")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t("admin.description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Detailed product description..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:border-sky-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("products.gauge")}
              </label>
              <select
                value={form.gauge ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gauge: e.target.value ? Number(e.target.value) : null }))
                }
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer"
              >
                {GAUGE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g} GA
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("admin.basePrice")}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.priceUsd ?? ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, priceUsd: e.target.value ? Number(e.target.value) : null }))
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("admin.stockQty")}
              </label>
              <Input
                type="number"
                min="0"
                value={form.stockQuantity}
                onChange={(e) => setForm((p) => ({ ...p, stockQuantity: Number(e.target.value) || 0 }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("admin.application")}
              </label>
              <select
                value={form.application}
                disabled
                className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 shadow-sm cursor-not-allowed"
              >
                <option value="hand">{t("admin.manualHand")}</option>
                <option value="machine">{t("admin.machineFilm")}</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">{t("admin.applicationHint")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t("admin.category")}
              </label>
              <select
                value={form.categorySlug}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    categorySlug: e.target.value,
                    application: getApplicationForCategory(e.target.value),
                  }))
                }
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end pb-1.5">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">{t("admin.activeVisible")}</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-2">
            <p className="text-xs font-bold text-slate-700">{t("admin.availability")}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer ${
                  !form.isSoldOut
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="availability"
                  checked={!form.isSoldOut}
                  onChange={() => setForm((p) => ({ ...p, isSoldOut: false }))}
                  className="h-4 w-4 text-emerald-600"
                />
                <span className="text-sm font-semibold text-slate-800">
                  {t("admin.available")} ({t("admin.inStock")})
                </span>
              </label>
              <label
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer ${
                  form.isSoldOut
                    ? "border-rose-300 bg-rose-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="availability"
                  checked={form.isSoldOut}
                  onChange={() => setForm((p) => ({ ...p, isSoldOut: true }))}
                  className="h-4 w-4 text-rose-600"
                />
                <span className="text-sm font-semibold text-slate-800">
                  {t("admin.soldOut")}
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <h3 className="text-sm font-black text-slate-900">{t("admin.pricingTiers")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t("admin.casePrice")}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceCase ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, priceCase: e.target.value ? Number(e.target.value) : null }))
                  }
                  placeholder="0.00"
                />
                <p className="text-[10px] text-slate-400 mt-1">e.g. 4-6 Rolls per Case/Box</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t("admin.halfPalletPrice")}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceHalfPallet ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, priceHalfPallet: e.target.value ? Number(e.target.value) : null }))
                  }
                  placeholder="0.00"
                />
                <p className="text-[10px] text-slate-400 mt-1">e.g. 24 Rolls / Half Pallet</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t("admin.fullPalletPrice")}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.pricePallet ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, pricePallet: e.target.value ? Number(e.target.value) : null }))
                  }
                  placeholder="0.00"
                />
                <p className="text-[10px] text-slate-400 mt-1">e.g. 48+ Rolls / Full Pallet</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">{t("admin.packageOptionsTitle")}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Fixed roll-count packages shown on the public product page. SKUs are auto-generated from the
                Part Number.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  { key: "price6Rolls" as const, label: "6 ROLLS", suffix: "6R" },
                  { key: "price12Rolls" as const, label: "12 ROLLS", suffix: "12R" },
                  { key: "price20Rolls" as const, label: "20 ROLLS (HALF PALLET)", suffix: "20R" },
                  { key: "price40Rolls" as const, label: "40 ROLLS (FULL PALLET)", suffix: "40R" },
                ]
              ).map((tier) => (
                <div key={tier.key} className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2">
                  <span className="text-xs font-bold text-slate-800">{tier.label}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("admin.priceUsd")}</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form[tier.key]}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, [tier.key]: Number(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">SKU</label>
                      <Input
                        value={`${(form.partNumber || "SKU").toUpperCase()}-${tier.suffix}`}
                        disabled
                        className="bg-slate-100 text-slate-500 font-mono text-xs cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t("admin.imageUrl")}
            </label>
            <Input
              value={form.imageUrl}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
              }
              onBlur={(e) => {
                const imageUrl = e.target.value.trim();
                if (!imageUrl) return;
                setForm((prev) => ({
                  ...prev,
                  imageUrl,
                  images: prev.images.includes(imageUrl)
                    ? prev.images
                    : [imageUrl, ...prev.images.filter(Boolean)],
                }));
              }}
              placeholder="https://…/product.png"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Paste a public image URL or upload a file below.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t("admin.productImages")}
            </label>

            <div className="flex flex-wrap gap-3 mb-3">
              {form.images.map((img) => (
                <div
                  key={img}
                  className={`relative w-20 h-20 rounded-xl border-2 overflow-hidden flex-shrink-0 group ${
                    form.imageUrl === img ? "border-sky-500" : "border-slate-200"
                  }`}
                >
                  <Image src={img} alt="Product" fill sizes="80px" className="object-contain bg-white p-1" />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/60 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(img)}
                      title="Set as primary"
                      className="p-1 rounded-lg bg-white/90 text-sky-700 hover:bg-white cursor-pointer"
                    >
                      <Star className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img)}
                      title="Remove image"
                      className="p-1 rounded-lg bg-white/90 text-red-600 hover:bg-white cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-sky-600 hover:border-sky-400 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5" />
                    <span className="text-[9px] font-bold">{t("admin.upload")}</span>
                  </>
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-[10px] text-slate-400">
              Uploads go directly to the Supabase <code>product-images</code> storage bucket. Click a thumbnail to set it as the primary image.
            </p>
          </div>
        </div>

          <div className="flex items-center justify-end gap-3 shrink-0 p-6 border-t">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isSaving || isUploading} className="gap-1.5">
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {isSaving ? t("admin.saving") : product ? t("admin.saveChanges") : t("admin.createProduct")}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
