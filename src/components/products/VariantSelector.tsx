"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ProductVariant } from "@/types";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { ShoppingCart, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DirectCheckoutButton } from "@/components/checkout/DirectCheckoutButton";
import { ProductDiscountInput } from "@/components/products/ProductDiscountInput";
import type { AppliedDiscount } from "@/types/discount";
import { applyDiscountToPrice, formatDiscountAppliedBadge } from "@/lib/discounts";
import {
  HAND_FULL_PALLET,
  isMachineFilm as detectMachineFilm,
  normalizeMachinePackageLabel,
  unitLabelForProduct,
} from "@/lib/products";

type PackageTierKind =
  | "single_unit"
  | "fixed_mid"
  | "fixed_half"
  | "full_pallet"
  | "other";

function getVariantLabel(variant: any): string {
  return String(variant?.title || variant?.packageSize || variant?.sku || "").toUpperCase();
}

function getRollsCount(variant: any): number {
  return Number(
    variant?.rolls_count ?? variant?.rollsCount ?? variant?.rollsPerBox ?? variant?.rolls ?? 0
  );
}

function getBoxesCount(variant: any, isMachine: boolean): number {
  if (isMachine) return 0;

  const explicit = Number(variant?.boxes_count ?? variant?.boxesCount);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const label = getVariantLabel(variant);
  const boxMatch = label.match(/(\d+)\s*BOX/);
  if (boxMatch) return Number(boxMatch[1]);

  const rolls = getRollsCount(variant);
  if (rolls <= 4) return 1;
  if (rolls === HAND_FULL_PALLET.rolls) return HAND_FULL_PALLET.boxes;
  return Math.round(rolls / 4);
}

/** Classify package option into business-rule tiers. */
function getPackageTierKind(variant: any, isMachine: boolean): PackageTierKind {
  if (!variant) return "other";

  const label = getVariantLabel(variant);
  const rolls = getRollsCount(variant);
  const boxes = getBoxesCount(variant, isMachine);

  if (isMachine) {
    if (label.includes("FULL PALLET") || rolls === 40) return "full_pallet";
    if (label.includes("HALF PALLET") || rolls === 20) return "fixed_half";
    if (label.includes("1 ROLL") || rolls === 1) return "single_unit";
    return "other";
  }

  if (
    label.includes("FULL PALLET") ||
    label.includes("48 BOXES") ||
    label.includes("64 BOXES") ||
    rolls === HAND_FULL_PALLET.rolls ||
    rolls === 256 ||
    boxes === HAND_FULL_PALLET.boxes ||
    boxes === 64
  ) {
    return "full_pallet";
  }

  if (
    label.includes("HALF PALLET") ||
    label.includes("32 BOXES") ||
    rolls === 128 ||
    boxes === 32
  ) {
    return "fixed_half";
  }

  if (label.includes("16 BOXES") || rolls === 64 || boxes === 16) {
    return "fixed_mid";
  }

  if (label.includes("1 BOX") || (boxes === 1 && rolls <= 4) || rolls === 4) {
    return "single_unit";
  }

  return "other";
}

function findTierVariant(
  variants: any[],
  kind: PackageTierKind,
  isMachine: boolean
): any | undefined {
  return variants.find((v) => getPackageTierKind(v, isMachine) === kind);
}

function getVariantPrice(variant: any): number {
  const price = parseFloat(String(variant?.priceUsd ?? variant?.price ?? "0"));
  return Number.isFinite(price) && price > 0 ? price : 0;
}

/** Base unit price: per box (hand) or per roll (machine). */
function getBaseUnitPrice(variants: any[], isMachine: boolean): number {
  const single = findTierVariant(variants, "single_unit", isMachine);
  if (single) {
    const price = getVariantPrice(single);
    if (price > 0) return price;
  }

  let best = 0;
  for (const variant of variants) {
    const price = getVariantPrice(variant);
    if (!(price > 0)) continue;
    const divisor = isMachine
      ? Math.max(1, getRollsCount(variant))
      : Math.max(1, getBoxesCount(variant, false));
    const perUnit = price / divisor;
    if (best === 0 || perUnit < best) best = perUnit;
  }
  return best;
}

function getPackageSavings(variant: any, baseUnitPrice: number, isMachine: boolean) {
  const unitCount = isMachine
    ? Math.max(1, getRollsCount(variant))
    : Math.max(1, getBoxesCount(variant, false));
  const variantPrice = getVariantPrice(variant);
  const undiscountedTotal = baseUnitPrice * unitCount;

  if (!baseUnitPrice || !variantPrice || undiscountedTotal <= 0) {
    return {
      unitCount,
      savingsPercent: 0,
      perUnitPrice: variantPrice > 0 ? (variantPrice / unitCount).toFixed(2) : "0.00",
    };
  }

  const rawSavings = ((undiscountedTotal - variantPrice) / undiscountedTotal) * 100;
  const savingsPercent = rawSavings > 0 ? Math.round(rawSavings) : 0;
  const perUnitPrice = (variantPrice / unitCount).toFixed(2);

  return { unitCount, savingsPercent, perUnitPrice };
}

function displayPackageTitle(variant: any, isMachine: boolean): string {
  const raw = String(variant?.title || variant?.packageSize || variant?.sku || "");
  if (isMachine) {
    return normalizeMachinePackageLabel(getRollsCount(variant), raw);
  }
  const upper = raw.toUpperCase();
  if (
    upper.includes("FULL PALLET") ||
    upper.includes("64 BOXES") ||
    getRollsCount(variant) === 256
  ) {
    return HAND_FULL_PALLET.label;
  }
  return raw;
}

interface VariantSelectorProps {
  product: any;
  selectedVariantId?: string;
  selectedVariant?: any;
  onVariantChange?: (variant: any) => void;
  [key: string]: any;
}

export function VariantSelector({
  product,
  selectedVariantId: propSelectedVariantId,
  selectedVariant: propSelectedVariant,
  onVariantChange,
}: VariantSelectorProps) {
  const { t } = useLanguage();
  const isMachineFilm = detectMachineFilm(product);
  const unitLabel = unitLabelForProduct(isMachineFilm);
  const unitLabelPlural = isMachineFilm ? "Rolls" : "Boxes";

  // Prefer configured package tiers when they carry real prices; otherwise use SKU variants.
  const variants = useMemo(() => {
    const mapped = (() => {
      if (product?.packageOptions?.length) {
        return product.packageOptions
          .map((opt: any) => {
            const price = Number(opt.price);
            if (!Number.isFinite(price) || price <= 0) return null;
            const rolls = Number(opt.rolls) || 1;
            const label = isMachineFilm
              ? normalizeMachinePackageLabel(rolls, opt.label)
              : rolls === HAND_FULL_PALLET.rolls ||
                  String(opt.label || "").toUpperCase().includes("FULL PALLET")
                ? HAND_FULL_PALLET.label
                : opt.label;
            return {
              id: opt.sku,
              sku: opt.sku,
              packageSize: label,
              title: label,
              priceUsd: String(price),
              price,
              rollsPerBox: rolls,
              rollsPerPallet: product?.fullPalletRolls || (isMachineFilm ? 40 : 192),
              widthInches: product?.width_inches || product?.widthInches || (isMachineFilm ? "20.00" : "18.00"),
              gauge: product?.gauge || 60,
              lengthFeet: product?.length_feet || product?.lengthFeet || 1000,
              weightLbs: "0.00",
              stockStatus: "in_stock",
              createdAt: new Date(),
              rolls_count: rolls,
              boxes_count: isMachineFilm
                ? 0
                : rolls <= 4
                  ? 1
                  : rolls === HAND_FULL_PALLET.rolls
                    ? HAND_FULL_PALLET.boxes
                    : Math.round(rolls / 4),
            };
          })
          .filter(Boolean);
      }
      return (product?.variants || [])
        .filter((v: any) => {
          const price = parseFloat(String(v.priceUsd ?? v.price ?? ""));
          return Number.isFinite(price) && price > 0;
        })
        .map((v: any) => {
          if (!isMachineFilm) {
            const rolls = getRollsCount(v);
            if (
              String(v.packageSize || v.title || "").toUpperCase().includes("FULL PALLET") ||
              rolls === 256
            ) {
              return {
                ...v,
                packageSize: HAND_FULL_PALLET.label,
                title: HAND_FULL_PALLET.label,
                rollsPerBox: HAND_FULL_PALLET.rolls,
                rolls_count: HAND_FULL_PALLET.rolls,
                boxes_count: HAND_FULL_PALLET.boxes,
              };
            }
            return v;
          }
          const rolls = getRollsCount(v);
          const label = normalizeMachinePackageLabel(rolls, v.title || v.packageSize);
          const normalizedRolls = label.startsWith("1 ROLL")
            ? 1
            : label.includes("20 ROLLS")
              ? 20
              : label.includes("40 ROLLS")
                ? 40
                : rolls;
          return {
            ...v,
            packageSize: label,
            title: label,
            rollsPerBox: normalizedRolls,
            rolls_count: normalizedRolls,
            boxes_count: 0,
            boxesCount: 0,
          };
        })
        .filter((v: any, index: number, arr: any[]) => {
          if (!isMachineFilm) return true;
          // Prefer canonical machine tiers; drop non 1/20/40 when those exist
          const rolls = getRollsCount(v);
          const hasCanonical = arr.some((x) => [1, 20, 40].includes(getRollsCount(x)));
          if (hasCanonical && ![1, 20, 40].includes(rolls)) return false;
          // Dedupe by roll count (keep first/cheapest already sorted upstream)
          return arr.findIndex((x) => getRollsCount(x) === rolls) === index;
        });
    })();

    if (!isMachineFilm) return mapped;
    return [...mapped].sort((a: any, b: any) => getRollsCount(a) - getRollsCount(b));
  }, [product, isMachineFilm]);

  const addItem = useCartStore((state) => state.addItem);
  const setAppliedCoupon = useCartStore((state) => state.setAppliedCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);

  const [internalSelectedVariantId, setInternalSelectedVariantId] = useState<string>(
    String(variants[0]?.id || variants[0]?.sku || "0")
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState(false);
  const [tierHint, setTierHint] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  const handleDiscountApplied = useCallback(
    (discount: AppliedDiscount | null) => {
      setAppliedDiscount(discount);
      if (discount && discount.discountType === "percent") {
        setAppliedCoupon({
          id: discount.id,
          code: discount.code,
          discountPercent: discount.discountValue,
          targetType: "global",
          targetValue: null,
        });
      } else if (!discount) {
        clearCoupon();
      }
    },
    [setAppliedCoupon, clearCoupon]
  );

  const selectedVariant: ProductVariant = useMemo(() => {
    if (propSelectedVariant) return propSelectedVariant;
    const targetId = propSelectedVariantId || internalSelectedVariantId;
    return (
      variants.find(
        (v: any) =>
          v.id === targetId ||
          v.sku === targetId ||
          String(v.id) === String(targetId) ||
          String(v.sku) === String(targetId)
      ) || variants[0]
    );
  }, [variants, propSelectedVariant, propSelectedVariantId, internalSelectedVariantId]);

  const selectedVariantId =
    propSelectedVariantId ||
    propSelectedVariant?.id ||
    propSelectedVariant?.sku ||
    selectedVariant?.id ||
    selectedVariant?.sku ||
    internalSelectedVariantId;

  const packageTier = getPackageTierKind(selectedVariant, isMachineFilm);
  const isFixedTier = packageTier === "fixed_mid" || packageTier === "fixed_half";
  const isSingleUnitTier = packageTier === "single_unit";
  const isFullPalletTier = packageTier === "full_pallet";
  const quantityEditable = !isFixedTier;
  const midTierVariant = findTierVariant(variants, "fixed_mid", isMachineFilm);
  const hasMidTierUpgrade = Boolean(midTierVariant) && !isMachineFilm;
  const baseUnitPrice = useMemo(
    () => getBaseUnitPrice(variants, isMachineFilm),
    [variants, isMachineFilm]
  );
  const showSmartUpsell =
    !isMachineFilm &&
    isSingleUnitTier &&
    hasMidTierUpgrade &&
    quantity >= 10 &&
    quantity <= 15;

  const selectVariant = useCallback(
    (variant: any, nextQty = 1) => {
      if (!variant) return;
      if (onVariantChange) onVariantChange(variant);
      setInternalSelectedVariantId(String(variant.id || variant.sku));
      setQuantity(nextQty);
    },
    [onVariantChange]
  );

  const handleSwitchToMidTier = () => {
    if (!midTierVariant) return;
    selectVariant(midTierVariant, 1);
    setTierHint(`Switched to 16 ${unitLabelPlural} package for better bulk pricing.`);
  };

  // Lock fixed tiers to qty 1 whenever they become active
  useEffect(() => {
    if (isFixedTier && quantity !== 1) {
      setQuantity(1);
    }
  }, [isFixedTier, quantity, selectedVariantId]);

  const parsedUnitPrice = parseFloat(
    String(selectedVariant?.priceUsd ?? (selectedVariant as any)?.price ?? "")
  );
  const baseUnitPriceRaw =
    Number.isFinite(parsedUnitPrice) && parsedUnitPrice > 0
      ? parsedUnitPrice
      : Number(product?.startingPrice) > 0
        ? Number(product.startingPrice)
        : 0;
  const unitPrice = applyDiscountToPrice(baseUnitPriceRaw, appliedDiscount);
  const effectiveQuantity = isFixedTier ? 1 : quantity;
  const totalPrice = Number((unitPrice * effectiveQuantity).toFixed(2));
  const hasActiveDiscount = Boolean(appliedDiscount && baseUnitPriceRaw > 0);

  const handleQuantityDecrease = () => {
    if (!quantityEditable) return;
    setQuantity((prev) => Math.max(1, prev - 1));
    setTierHint(null);
  };

  const handleQuantityIncrease = () => {
    if (!quantityEditable) return;

    if (isSingleUnitTier && !isMachineFilm) {
      if (quantity >= 15) {
        if (midTierVariant) {
          selectVariant(midTierVariant, 1);
          setTierHint(`Upgraded to 16 ${unitLabelPlural} package for higher volume.`);
          return;
        }
        setTierHint(`For 16+ ${unitLabelPlural.toLowerCase()}, select the 16 ${unitLabelPlural} package`);
        setQuantity(15);
        return;
      }
      setQuantity((prev) => Math.min(15, prev + 1));
      setTierHint(null);
      return;
    }

    // Full pallet / machine single roll / other flexible tiers
    setQuantity((prev) => prev + 1);
    setTierHint(null);
  };

  const handleQuantityInput = (raw: string) => {
    if (!quantityEditable) return;
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      setQuantity(1);
      return;
    }

    if (isSingleUnitTier && !isMachineFilm) {
      if (parsed >= 16) {
        if (midTierVariant) {
          selectVariant(midTierVariant, 1);
          setTierHint(`Upgraded to 16 ${unitLabelPlural} package for higher volume.`);
          return;
        }
        setTierHint(`For 16+ ${unitLabelPlural.toLowerCase()}, select the 16 ${unitLabelPlural} package`);
        setQuantity(15);
        return;
      }
      setQuantity(Math.max(1, Math.min(15, parsed)));
      setTierHint(null);
      return;
    }

    setQuantity(Math.max(1, parsed));
    setTierHint(null);
  };

  const handlePackageSelect = (variant: any) => {
    selectVariant(variant, 1);
    setTierHint(null);
  };

  const handleAddToCart = () => {
    if (!selectedVariant || baseUnitPriceRaw <= 0) return;
    const rolls = getRollsCount(selectedVariant);

    // Percent codes sync to cart coupon — store list price to avoid double discount.
    // Fixed codes are applied at line level only (cart coupon is percent-based).
    const cartUnitPrice =
      appliedDiscount?.discountType === "fixed"
        ? unitPrice
        : baseUnitPriceRaw;

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.title || product.name || "Stretch Film",
      productImage: product.imageUrl,
      packageSize: displayPackageTitle(selectedVariant, isMachineFilm),
      totalRolls: rolls,
      totalBoxes: isMachineFilm ? 0 : getBoxesCount(selectedVariant, false),
      application: product.application,
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      widthInches: selectedVariant.widthInches,
      gauge: selectedVariant.gauge,
      lengthFeet: selectedVariant.lengthFeet,
      rollsPerBox: selectedVariant.rollsPerBox,
      rollsPerPallet: selectedVariant.rollsPerPallet,
      weightLbs: selectedVariant.weightLbs,
      pricingTier: displayPackageTitle(selectedVariant, isMachineFilm),
      unitPrice: cartUnitPrice,
      quantity: effectiveQuantity,
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 space-y-7 shadow-xl shadow-slate-200/40">
      {/* Dynamic Price Header */}
      <div className="pb-5 border-b border-slate-100 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold block mb-1">
            {t("products.officialFactoryDirectPrice")}
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            {hasActiveDiscount && baseUnitPriceRaw !== unitPrice && (
              <span className="text-lg sm:text-xl font-bold text-slate-400 line-through tracking-tight">
                {formatCurrency(baseUnitPriceRaw)}
              </span>
            )}
            <span
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                hasActiveDiscount ? "text-emerald-700" : "text-slate-900"
              }`}
            >
              {unitPrice > 0 ? formatCurrency(unitPrice) : "—"}
            </span>
            {unitPrice > 0 && (
              <span className="text-sm font-bold text-slate-500">USD</span>
            )}
            {appliedDiscount && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                {formatDiscountAppliedBadge(appliedDiscount)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-xs font-semibold px-3 py-1">
            ● {t("products.inStock")}
          </Badge>
        </div>
      </div>

      {/* Package Size Pill Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            {t("products.packageOptions")}
          </label>
          <span className="text-xs font-semibold text-blue-700">
            {displayPackageTitle(selectedVariant, isMachineFilm)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {variants.map((variant: any, index: number) => {
            const isSelected =
              selectedVariant?.id === variant.id ||
              selectedVariant?.sku === variant.sku ||
              selectedVariantId === variant.id ||
              selectedVariantId === variant.sku ||
              (Boolean(selectedVariant?.id && variant.id) &&
                String(selectedVariant?.id) === String(variant.id)) ||
              (Boolean(selectedVariant?.sku && variant.sku) &&
                String(selectedVariant?.sku) === String(variant.sku)) ||
              (Boolean(selectedVariantId && variant.id) &&
                String(selectedVariantId) === String(variant.id)) ||
              (Boolean(selectedVariantId && variant.sku) &&
                String(selectedVariantId) === String(variant.sku)) ||
              (index === 0 && !selectedVariant);

            const originalPrice = getVariantPrice(variant);
            const price = applyDiscountToPrice(originalPrice, appliedDiscount);
            const variantTitle = displayPackageTitle(variant, isMachineFilm);
            const rollsCount = getRollsCount(variant);
            const boxesCount = getBoxesCount(variant, isMachineFilm);
            const tierKind = getPackageTierKind(variant, isMachineFilm);
            const isBestValue = tierKind === "full_pallet";
            const { savingsPercent, perUnitPrice, unitCount } = getPackageSavings(
              variant,
              baseUnitPrice,
              isMachineFilm
            );
            const discountedPerUnit =
              unitCount > 0 ? (price / unitCount).toFixed(2) : perUnitPrice;
            const showSavings = savingsPercent > 0 && unitCount > 1;
            const showDiscountStrike =
              Boolean(appliedDiscount) && originalPrice > 0 && price < originalPrice;

            return (
              <button
                key={
                  variant.id ||
                  variant.sku ||
                  `variant-${variant.rollsCount || (variant as any).rolls_count}-${index}`
                }
                type="button"
                onClick={() => handlePackageSelect(variant)}
                className={`relative p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex flex-col gap-2.5 group cursor-pointer ${
                  isBestValue
                    ? isSelected
                      ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/25 shadow-sm"
                      : "border-emerald-300 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/40"
                    : isSelected
                      ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/20 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                {isBestValue && (
                  <div className="absolute -top-2.5 left-3 inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                    Best Value · Max Savings (~{savingsPercent > 0 ? savingsPercent : 13}% OFF)
                  </div>
                )}

                <div className={`flex items-center justify-between gap-3 ${isBestValue ? "pt-1" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? isBestValue
                            ? "border-emerald-600 bg-emerald-600 ring-2 ring-emerald-600/30"
                            : "border-blue-600 bg-blue-600 ring-2 ring-blue-600/30"
                          : "border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            isSelected ? "text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {variantTitle}
                        </span>
                        {showSavings && (
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            Save {savingsPercent}% OFF
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {isMachineFilm ? (
                          <>
                            SKU: {variant.sku} · {rollsCount}{" "}
                            {rollsCount === 1 ? "Roll" : "Rolls"}
                            {tierKind === "fixed_half" ? " (1 layer)" : ""}
                            {tierKind === "full_pallet" ? " (2 layers)" : ""}
                          </>
                        ) : (
                          <>
                            SKU: {variant.sku} · {rollsCount} Rolls included ({boxesCount}{" "}
                            {boxesCount === 1 ? "Box" : "Boxes"})
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {showDiscountStrike && (
                      <span className="text-xs font-semibold text-slate-400 line-through block">
                        {formatCurrency(originalPrice)}
                      </span>
                    )}
                    <span
                      className={`text-sm sm:text-base font-extrabold ${
                        showDiscountStrike
                          ? "text-emerald-700"
                          : isSelected
                            ? isBestValue
                              ? "text-emerald-800"
                              : "text-blue-800"
                            : "text-slate-900"
                      }`}
                    >
                      {formatCurrency(price)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-semibold">USD</span>
                    {unitCount > 1 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        ${discountedPerUnit} USD / {unitLabel.toLowerCase()}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <ProductDiscountInput
        appliedDiscount={appliedDiscount}
        onApplied={handleDiscountApplied}
      />

      {/* Specifications Highlight Box */}
      {(() => {
        const widthVal =
          (product as any)?.width_inches ||
          (product as any)?.widthInches ||
          selectedVariant?.widthInches ||
          "18";
        const widthFormatted = Math.round(parseFloat(String(widthVal)));

        const gaugeVal = (product as any)?.gauge || selectedVariant?.gauge || 60;

        const lengthVal =
          (product as any)?.length_feet ||
          (product as any)?.lengthFeet ||
          selectedVariant?.lengthFeet ||
          1000;

        const coreType =
          (product as any)?.core_type || (product as any)?.coreType || 'Standard 3" Core';

        return (
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              {t("products.specifications")}
            </label>
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("products.width")}
                </span>
                <span className="font-bold text-slate-900">{widthFormatted}&quot; Inches</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("products.gauge")}
                </span>
                <span className="font-bold text-slate-900">{gaugeVal} Gauge</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("products.length")}
                </span>
                <span className="font-bold text-slate-900">
                  {Number(lengthVal).toLocaleString()} Feet
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("products.coreType")}
                </span>
                <span className="font-bold text-slate-900">{coreType}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quantity & Actions */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-600 font-bold uppercase">
                {t("products.quantity")}
                {isFullPalletTier
                  ? " (Full Pallets)"
                  : isSingleUnitTier
                    ? ` (${unitLabelPlural})`
                    : ""}
                :
              </span>
              {isFixedTier && (
                <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  Fixed Package (Qty: 1)
                </span>
              )}
            </div>

            <div
              className={`flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm ${
                !quantityEditable ? "opacity-60" : ""
              }`}
            >
              <button
                type="button"
                onClick={handleQuantityDecrease}
                disabled={!quantityEditable || quantity <= 1}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 font-bold disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                max={isSingleUnitTier && !isMachineFilm ? 15 : undefined}
                value={effectiveQuantity}
                readOnly={isFixedTier}
                disabled={isFixedTier}
                onChange={(e) => handleQuantityInput(e.target.value)}
                className="w-12 bg-transparent text-center text-sm font-bold text-slate-900 focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={handleQuantityIncrease}
                disabled={
                  !quantityEditable ||
                  (isSingleUnitTier &&
                    !isMachineFilm &&
                    quantity >= 15 &&
                    !hasMidTierUpgrade)
                }
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 font-bold disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent"
              >
                +
              </button>
            </div>

            {isSingleUnitTier && !isMachineFilm && quantity >= 15 && (
              <p className="text-[10px] font-medium text-sky-700">
                For 16+ {unitLabelPlural.toLowerCase()}, select the 16 {unitLabelPlural} package
              </p>
            )}
            {tierHint && (
              <p className="text-[10px] font-medium text-sky-700">{tierHint}</p>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">
              {t("products.subtotal")}
            </span>
            {hasActiveDiscount && (
              <span className="text-sm font-semibold text-slate-400 line-through block">
                {formatCurrency(
                  Number((baseUnitPriceRaw * effectiveQuantity).toFixed(2))
                )}
              </span>
            )}
            <span
              className={`text-xl sm:text-2xl font-black ${
                hasActiveDiscount ? "text-emerald-700" : "text-slate-900"
              }`}
            >
              {formatCurrency(totalPrice)}{" "}
              <span className="text-xs font-semibold text-slate-500">USD</span>
            </span>
          </div>
        </div>

        {showSmartUpsell && (
          <div
            key={`upsell-${quantity}`}
            className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 my-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
            role="status"
          >
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs leading-relaxed text-slate-700">
                <span aria-hidden="true">💡 </span>
                <span className="font-bold text-slate-900">Smart Suggestion:</span>{" "}
                You have selected{" "}
                <span className="font-bold text-slate-900">{quantity}</span>{" "}
                {unitLabelPlural.toLowerCase()}. Upgrading to the{" "}
                <span className="font-bold text-slate-900">16 BOXES (64 ROLLS)</span> package
                offers better bulk pricing and lower unit cost.
              </p>
              <button
                type="button"
                onClick={handleSwitchToMidTier}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-500 transition-colors cursor-pointer"
              >
                Switch to 16 {unitLabelPlural} →
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2.5 pt-1">
          <Button
            type="button"
            onClick={handleAddToCart}
            variant="gradient"
            size="lg"
            disabled={baseUnitPriceRaw <= 0}
            className="w-full flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-sky-500/20 py-6 rounded-2xl"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{t("products.addToCart")}</span>
          </Button>

          <DirectCheckoutButton
            label={t("products.directCheckout")}
            onBeforeNavigate={() => {
              handleAddToCart();
            }}
          />
        </div>
      </div>

      {addedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-semibold shadow-sm animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            {t("products.addedToCart")
              .replace("{count}", String(effectiveQuantity))
              .replace("{product}", String(selectedVariant?.packageSize || "this product"))}
          </span>
        </div>
      )}
    </div>
  );
}
