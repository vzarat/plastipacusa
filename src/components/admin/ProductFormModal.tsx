"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  getAdminProductVariants,
  updateProduct,
  uploadProductImage,
} from "@/actions/products";
import {
  AdminPackageTier,
  AdminProduct,
  GAUGE_OPTIONS,
  PACKAGE_TIER_DEFAULTS,
  ProductFormValues,
} from "@/types/product";
import { PRODUCT_CATEGORIES, categorySlugFromRecord, getApplicationForCategory } from "@/data/categories";
import { readBoxTierPrices } from "@/lib/pricing";
import { HAND_FULL_PALLET_BOXES } from "@/lib/pricing";
import { stockBoxSplitLabel } from "@/lib/pallet-stock";
import { useLanguage } from "@/context/LanguageContext";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: AdminProduct | null;
  onSaved: (product: AdminProduct, isNew: boolean) => void;
  showToast: (msg: string) => void;
}

const DEFAULT_CATEGORY_SLUG = PRODUCT_CATEGORIES[0]?.slug || "force-standard";

function textValue(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function numberOrNull(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

const DEFAULT_PACKAGE_OPTIONS = [
  { label: "1 BOX WITH 4 ROLLS", rollsCount: 4, boxesCount: 1, suffix: "1B" },
  { label: "16 BOXES = 64 ROLLS", rollsCount: 64, boxesCount: 16, suffix: "16B" },
  { label: "32 BOXES = 128 ROLLS (HALF PALLET)", rollsCount: 128, boxesCount: 32, suffix: "32B" },
  { label: "64 BOXES = 256 ROLLS (FULL PALLET)", rollsCount: 256, boxesCount: 64, suffix: "64B" },
] as const;

function packageSku(baseSku: string, suffix: string): string {
  const base = baseSku.trim();
  return base ? `${base}-${suffix}` : "";
}

function defaultPackageTiers(baseSku: string): AdminPackageTier[] {
  return DEFAULT_PACKAGE_OPTIONS.map((option) => ({
    label: option.label,
    sku: packageSku(baseSku, option.suffix),
    price: 0,
    boxesCount: option.boxesCount,
    rollsCount: option.rollsCount,
  }));
}

function columnPriceForBoxes(source: unknown, boxes: number): number | null {
  const prices = readBoxTierPrices(source);
  if (boxes === 1) return prices.price1Box;
  if (boxes === 16) return prices.price16Boxes;
  if (boxes === 32) return prices.price32Boxes;
  if (boxes === 64) return prices.price64Boxes;
  return null;
}

function withDefaultPackageTiers(
  tiers: AdminPackageTier[] | undefined,
  baseSku: string,
  application: "hand" | "machine" = "hand",
  columnSource?: unknown
): AdminPackageTier[] {
  const saved = Array.isArray(tiers) ? tiers : [];
  if (application === "machine") {
    return saved.length > 0 ? saved : defaultPackageTiers(baseSku);
  }
  return DEFAULT_PACKAGE_OPTIONS.map((option) => {
    const match =
      saved.find((tier) => Number(tier.boxesCount) === option.boxesCount) ||
      saved.find((tier) => Number(tier.rollsCount) === option.rollsCount);
    const savedPrice = Number(match?.price);
    const columnPrice = columnPriceForBoxes(columnSource, option.boxesCount);
    return {
      id: match?.id,
      label: option.label,
      sku: match?.sku?.trim() || packageSku(baseSku, option.suffix),
      price: savedPrice > 0 ? savedPrice : columnPrice ?? 0,
      boxesCount: option.boxesCount,
      rollsCount: option.rollsCount,
      rollWeightLbs: match?.rollWeightLbs ?? null,
      boxWeightLbs: match?.boxWeightLbs ?? null,
      palletWeightLbs: match?.palletWeightLbs ?? null,
    };
  });
}

function productToForm(product: AdminProduct): ProductFormValues {
  const raw = product as AdminProduct & Record<string, unknown>;
  const categorySlug = categorySlugFromRecord(
    textValue(raw.category_id, raw.categoryId),
    textValue(raw.categorySlug, raw.category_slug, raw.category)
  );
  const application =
    raw.application === "machine" || raw.application === "hand"
      ? raw.application
      : getApplicationForCategory(categorySlug);
  const stockBoxes =
    raw.stockBoxes === undefined && raw.stock_boxes === undefined
      ? null
      : raw.stockBoxes == null && raw.stock_boxes == null
        ? null
        : Math.max(0, Math.floor(Number(raw.stockBoxes ?? raw.stock_boxes) || 0));

  return {
    id: product.id,
    name: textValue(raw.name, raw.title, raw.product_title),
    storefrontTitle: textValue(raw.storefrontTitle, raw.display_name, raw.displayName, raw.storefront_title),
    partNumber: textValue(raw.partNumber, raw.part_number, raw.sku),
    description: textValue(raw.description),
    gauge: numberOrNull(raw.gauge),
    widthInches: numberOrNull(raw.widthInches, raw.width_inches),
    lengthFeet: numberOrNull(raw.lengthFeet, raw.length_feet),
    rollsPerBox: numberOrNull(raw.rollsPerBox, raw.rolls_per_box),
    rollWeightLbs: numberOrNull(raw.rollWeightLbs, raw.roll_weight_lbs),
    palletWeightLbs: numberOrNull(raw.palletWeightLbs, raw.pallet_weight_lbs),
    palletDimensions: textValue(raw.palletDimensions, raw.pallet_dimensions),
    priceUsd: numberOrNull(raw.priceUsd, raw.base_unit_price, raw.price_usd, raw.price),
    priceCase: numberOrNull(raw.priceCase, raw.price_case),
    priceHalfPallet: numberOrNull(raw.priceHalfPallet, raw.price_half_pallet),
    pricePallet: numberOrNull(raw.pricePallet, raw.price_pallet),
    price6Rolls: numberOrNull(raw.price6Rolls, raw.price_6_rolls) ?? PACKAGE_TIER_DEFAULTS.price6Rolls,
    price12Rolls: numberOrNull(raw.price12Rolls, raw.price_12_rolls) ?? PACKAGE_TIER_DEFAULTS.price12Rolls,
    price20Rolls: numberOrNull(raw.price20Rolls, raw.price_20_rolls) ?? PACKAGE_TIER_DEFAULTS.price20Rolls,
    price40Rolls: numberOrNull(raw.price40Rolls, raw.price_40_rolls) ?? PACKAGE_TIER_DEFAULTS.price40Rolls,
    packageTiers: withDefaultPackageTiers(
      Array.isArray(raw.packageTiers)
        ? (raw.packageTiers as AdminPackageTier[]).map((tier) => ({
            id: tier.id,
            label: tier.label,
            sku: tier.sku,
            price: numberOrNull(tier.price) ?? 0,
            boxesCount: tier.boxesCount ?? null,
            rollsCount: tier.rollsCount ?? null,
            rollWeightLbs: numberOrNull(tier.rollWeightLbs),
            boxWeightLbs: numberOrNull(tier.boxWeightLbs),
            palletWeightLbs: numberOrNull(tier.palletWeightLbs),
          }))
        : [],
      textValue(raw.partNumber, raw.part_number, raw.sku),
      application,
      raw
    ),
    stockQuantity: numberOrNull(raw.stockQuantity, raw.stock_quantity, raw.stock_qty) ?? 0,
    stockBoxes,
    boxesPerPallet: Math.floor(Number(raw.boxesPerPallet ?? raw.boxes_per_pallet) || 0) || null,
    isSoldOut: stockBoxes === 0 || Boolean(raw.isSoldOut ?? raw.is_sold_out ?? false),
    application,
    categorySlug,
    imageUrl: textValue(raw.imageUrl, raw.image_url),
    images:
      Array.isArray(raw.images) && raw.images.length
        ? raw.images.map(String)
        : textValue(raw.imageUrl, raw.image_url)
          ? [textValue(raw.imageUrl, raw.image_url)]
          : [],
    isActive: raw.isActive !== false && raw.is_active !== false && raw.visible !== false,
  };
}

const EMPTY_FORM: ProductFormValues = {
  name: "",
  storefrontTitle: "",
  partNumber: "",
  description: "",
  gauge: GAUGE_OPTIONS[0],
  widthInches: null,
  lengthFeet: null,
  rollsPerBox: null,
  rollWeightLbs: null,
  palletWeightLbs: null,
  palletDimensions: "",
  priceUsd: null,
  priceCase: null,
  priceHalfPallet: null,
  pricePallet: null,
  price6Rolls: PACKAGE_TIER_DEFAULTS.price6Rolls,
  price12Rolls: PACKAGE_TIER_DEFAULTS.price12Rolls,
  price20Rolls: PACKAGE_TIER_DEFAULTS.price20Rolls,
  price40Rolls: PACKAGE_TIER_DEFAULTS.price40Rolls,
  packageTiers: defaultPackageTiers(""),
  stockQuantity: 0,
  stockBoxes: null,
  boxesPerPallet: null,
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
  const router = useRouter();
  const formSource = isOpen ? product?.id ?? "new" : "closed";
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM);
  const [loadedSource, setLoadedSource] = useState(formSource);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const tiersEdited = useRef(false);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;
  const [isUploading, setIsUploading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  if (loadedSource !== formSource) {
    setLoadedSource(formSource);
    tiersEdited.current = false;
    setForm(isOpen && product ? productToForm(product) : EMPTY_FORM);
  }

  useEffect(() => {
    if (!isOpen || !product?.id) return;
    let cancelled = false;
    setIsLoadingVariants(true);
    getAdminProductVariants(product.id)
      .then((tiers) => {
        if (cancelled || tiersEdited.current) return;
        setForm((prev) => ({
          ...prev,
          packageTiers: withDefaultPackageTiers(tiers, prev.partNumber, prev.application, product),
        }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Could not load package prices.";
        showToastRef.current(message);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingVariants(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, product?.id]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (isLoadingVariants) {
      showToast("Package prices are still loading.");
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
        router.refresh();
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

  const boxesPerPallet =
    Math.floor(Number(form.boxesPerPallet) || 0) ||
    (form.application === "machine" ? 0 : HAND_FULL_PALLET_BOXES);
  const stockBreakdown = stockBoxSplitLabel(form.stockBoxes, boxesPerPallet);

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
                onChange={(e) => {
                  const partNumber = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    partNumber,
                    packageTiers: prev.packageTiers.some((tier) => tier.id)
                      ? prev.packageTiers
                      : defaultPackageTiers(partNumber).map((tier, index) => ({
                          ...tier,
                          price: prev.packageTiers[index]?.price ?? 0,
                        })),
                  }));
                }}
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
                value={form.gauge === null || form.gauge === undefined ? "" : String(form.gauge)}
                onChange={(e) =>
                  setForm((p) => ({ ...p, gauge: e.target.value ? Number(e.target.value) : null }))
                }
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 cursor-pointer"
              >
                {(form.gauge !== null &&
                form.gauge !== undefined &&
                !GAUGE_OPTIONS.includes(form.gauge as (typeof GAUGE_OPTIONS)[number])
                  ? [form.gauge, ...GAUGE_OPTIONS]
                  : GAUGE_OPTIONS
                ).map((g) => (
                  <option key={g} value={String(g)}>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5" htmlFor="stock-boxes">
                {t("admin.stockQty")}
              </label>
              <Input
                id="stock-boxes"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="Untracked"
                value={form.stockBoxes ?? ""}
                onChange={(e) => {
                  const nextBoxes =
                    e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value) || 0));
                  setForm((current) => ({
                    ...current,
                    stockBoxes: nextBoxes,
                    isSoldOut: nextBoxes === 0,
                  }));
                }}
              />
              <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                {t("admin.stockPalletsHint")}
              </p>
              {stockBreakdown ? (
                <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-700">{stockBreakdown}</p>
              ) : null}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Width (in)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.widthInches ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    widthInches: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Length (ft)</label>
              <Input
                type="number"
                step="1"
                min="0"
                value={form.lengthFeet ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    lengthFeet: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Rolls per Box</label>
              <Input
                type="number"
                step="1"
                min="0"
                value={form.rollsPerBox ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    rollsPerBox: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Weight per Roll (lbs)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.rollWeightLbs ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    rollWeightLbs: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Pallet Weight (lbs)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.palletWeightLbs ?? ""}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    palletWeightLbs: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pallet Dimensions
              </label>
              <Input
                value={form.palletDimensions}
                onChange={(e) => setForm((p) => ({ ...p, palletDimensions: e.target.value }))}
                placeholder='48" x 48" x 78"'
              />
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
                {PRODUCT_CATEGORIES.filter((c) => c.slug !== "genesis-standard").map((c) => (
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
                  onChange={() =>
                    setForm((current) => ({
                      ...current,
                      isSoldOut: current.stockBoxes === 0,
                    }))
                  }
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
            <div>
              <h3 className="text-sm font-black text-slate-900">{t("admin.packageOptionsTitle")}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Price per box for 1, 16, 32, and 64 boxes. Saving writes each rate to product variants. The storefront multiplies it by the box count.
              </p>
            </div>

            {isLoadingVariants ? (
              <p className="text-xs text-slate-500">Loading saved box prices…</p>
            ) : null}
            {form.packageTiers.length === 0 ? (
              <p className="text-xs text-slate-500">
                This product has no package variants yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {form.packageTiers.map((tier, index) => (
                  <div
                    key={tier.id || tier.sku || `${tier.label}-${index}`}
                    className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-2"
                  >
                    <span className="text-xs font-bold text-slate-800">{tier.label}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Price per box (USD)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={tier.price ?? 0}
                          onChange={(e) => {
                            const nextPrice = e.target.value === "" ? 0 : Number(e.target.value);
                            tiersEdited.current = true;
                            setForm((prev) => ({
                              ...prev,
                              packageTiers: prev.packageTiers.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, price: Number.isFinite(nextPrice) ? nextPrice : 0 }
                                  : item
                              ),
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">SKU</label>
                        <Input
                          value={tier.sku}
                          onChange={(e) => {
                            const nextSku = e.target.value;
                            tiersEdited.current = true;
                            setForm((prev) => ({
                              ...prev,
                              packageTiers: prev.packageTiers.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, sku: nextSku } : item
                              ),
                            }));
                          }}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <Button type="submit" size="sm" disabled={isSaving || isUploading || isLoadingVariants} className="gap-1.5">
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
