"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ProductVariant } from "@/types";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency, formatLocaleNumber } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { ShoppingCart, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DirectCheckoutButton } from "@/components/checkout/DirectCheckoutButton";
import { ProductDiscountInput } from "@/components/products/ProductDiscountInput";
import type { AppliedDiscount } from "@/types/discount";
import { applyDiscountToPrice, formatDiscountAppliedBadge } from "@/lib/discounts";
import { boxStockLabel, boxesPerPalletForProduct, palletStockLabel } from "@/lib/pallet-stock";
import { usesCompact1880Pallets } from "@/lib/palletizing";
import {
  HAND_FULL_PALLET,
  buildMachineFilmSelectorTiers,
  isMachineFilm as detectMachineFilm,
  normalizeMachinePackageLabel,
  formatBoxRollLabel,
  isCatalogInStock,
  unitLabelForProduct,
} from "@/lib/products";
import { handFilmTierSku } from "@/lib/hand-film-sku";
import { packageTotalWeightLbs } from "@/lib/package-weight";
import { BOX_QTY_NOTE, HALF_PALLET_QTY_NOTE } from "@/lib/cart-quantity";
import { houstonFridayPresetLabel } from "@/lib/shippingRules";
import { getProductBySlug } from "@/actions/products";
import {
  HAND_FULL_PALLET_BOXES,
  buildHandFullPalletCartItem,
  normalizeHandPackageBoxes,
  perBoxPriceFromVariant,
  readBoxTierPrices,
  totalForBoxes,
  unitBoxPriceForCount,
} from "@/lib/pricing";

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

  const rolls = getRollsCount(variant);
  const normalized = normalizeHandPackageBoxes(variant?.boxes_count ?? variant?.boxesCount, rolls);
  if (normalized > 0) return normalized;

  const label = getVariantLabel(variant);
  const boxMatch = label.match(/(\d+)\s*BOX/);
  if (boxMatch) return normalizeHandPackageBoxes(boxMatch[1], rolls) || Number(boxMatch[1]);

  if (rolls <= 4) return 1;
  if (rolls === HAND_FULL_PALLET.rolls) return HAND_FULL_PALLET.boxes;
  return Math.round(rolls / 4) || 1;
}

function isCompact1880Package(variant: any): boolean {
  return usesCompact1880Pallets({
    widthInches: variant?.widthInches || variant?.width_inches,
    gauge: variant?.gauge,
    lengthFeet: variant?.lengthFeet || variant?.length_feet,
    slug: variant?.slug,
    name: variant?.title || variant?.name,
  });
}

/** Classify package option into business-rule tiers. */
const LAYER_LIMIT_NOTE =
  "Maximum 1 unit of 16 Boxes (64 Rolls). For higher quantities, select 32 Boxes (128 Rolls) or 64 Boxes (256 Rolls).";

function getPackageTierKind(variant: any, isMachine: boolean): PackageTierKind {
  if (!variant) return "other";

  const tierKey = String(variant?.tierKey || "").toLowerCase();
  if (tierKey === "full" || tierKey === "full_pallet") return "full_pallet";
  if (tierKey === "half" || tierKey === "half_pallet" || tierKey === "fixed_half") {
    return "fixed_half";
  }
  if (tierKey === "layer" || tierKey === "fixed_mid") return "fixed_mid";
  if (tierKey === "box" || tierKey === "single_unit") return "single_unit";

  const label = getVariantLabel(variant);
  const rolls = getRollsCount(variant);
  const boxes = getBoxesCount(variant, isMachine);

  if (!isMachine && isCompact1880Package(variant)) {
    if (label.includes("24 BOXES") || boxes === 24) return "full_pallet";
    if (label.includes("HALF PALLET") || label.includes("12 BOXES") || boxes === 12) {
      return "fixed_half";
    }
    if (label.includes("1 BOX") || boxes === 1 || rolls <= 4) return "single_unit";
    return "other";
  }

  if (isMachine) {
    if (label.includes("FULL PALLET") || rolls === 40) return "full_pallet";
    if (label.includes("HALF PALLET") || rolls === 20) return "fixed_half";
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

  if (
    label.includes("1 LAYER") ||
    label.includes("16 BOXES") ||
    rolls === 64 ||
    boxes === 16
  ) {
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

const HAND_PALLET_WEIGHT_NOTE =
  "Includes wooden pallet weight (~29.2 lbs) for LTL freight accuracy.";

/** Official hand-film presets. Totals come from the live per-box bracket, not a stored pallet rate. */
const STANDARD_HAND_PACKAGE_TIERS = [
  {
    key: "box",
    title: "1 Box (4 Rolls)",
    rolls: 4,
    boxes: 1,
    subtext: "4 Rolls included · Standard package",
  },
  {
    key: "layer",
    title: "16 Boxes (64 Rolls)",
    rolls: 64,
    boxes: 16,
    subtext: `64 Rolls included · Free RGV Freight Eligible. ${HAND_PALLET_WEIGHT_NOTE}`,
  },
  {
    key: "half",
    title: "32 Boxes (128 Rolls)",
    rolls: 128,
    boxes: 32,
    subtext: `128 Rolls included. ${HAND_PALLET_WEIGHT_NOTE}`,
  },
  {
    key: "full",
    title: "Full Pallet (Includes pallet & packaging)",
    rolls: 256,
    boxes: 64,
    subtext: `64 Boxes · 256 Rolls. ${HAND_PALLET_WEIGHT_NOTE}`,
  },
] as const;

function isSingleBoxSource(option: any): boolean {
  const rolls = Number(
    option?.rolls ?? option?.rolls_count ?? option?.rollsCount ?? option?.rollsPerBox ?? 0
  );
  const boxes = Number(option?.boxes_count ?? option?.boxesCount ?? 0);
  const label = String(option?.label || option?.title || option?.packageSize || "").toUpperCase();
  return boxes === 1 || rolls === 4 || label.includes("1 BOX");
}

function buildStandardHandTiers(product: any, sourceOptions: any[]): any[] {
  const prices = readBoxTierPrices(product);
  const single = sourceOptions.find((option) => isSingleBoxSource(option));
  const baseBoxPrice = unitBoxPriceForCount(prices, 1);

  const widthInches = String(
    product?.width_inches || product?.widthInches || single?.widthInches || "18.00"
  );
  const gauge = Number(product?.gauge || single?.gauge || 60);
  const lengthFeet = Number(
    product?.length_feet || product?.lengthFeet || single?.lengthFeet || 1000
  );
  const baseSku = String(single?.sku || product?.partNumber || product?.slug || "SKU");
  const weightSources = [product, ...(product?.variants || []), ...sourceOptions];
  const storedWeight = (keys: string[]) => {
    for (const source of weightSources) {
      if (!source) continue;
      for (const key of keys) {
        const amount = Number(source[key]);
        if (Number.isFinite(amount) && amount > 0) return amount;
      }
    }
    return null;
  };
  const sharedRollWeight = storedWeight(["rollWeightLbs", "roll_weight_lbs"]);
  const boxAmounts = weightSources.flatMap((source) =>
    ["boxWeightLbs", "box_weight_lbs"].map((key) => Number(source?.[key]))
  );
  const positiveBoxes = boxAmounts.filter((amount) => Number.isFinite(amount) && amount > 0);
  const sharedBoxWeight = positiveBoxes.length > 0 ? Math.min(...positiveBoxes) : null;
  const sharedPalletWeight = storedWeight(["palletWeightLbs", "pallet_weight_lbs"]);

  return STANDARD_HAND_PACKAGE_TIERS.flatMap((tier) => {
    const matched = sourceOptions.find((option) => {
      const boxes = Number(option?.boxes_count ?? option?.boxesCount ?? option?.boxes ?? 0);
      const rolls = Number(
        option?.rolls ?? option?.rolls_count ?? option?.rollsCount ?? option?.rollsPerBox ?? 0
      );
      return boxes === tier.boxes || rolls === tier.rolls;
    });
    const catalogBoxes = Number(matched?.boxes_count ?? matched?.boxesCount ?? tier.boxes);
    const catalogRolls = Number(
      matched?.rolls_count ?? matched?.rollsCount ?? matched?.rolls ?? tier.rolls
    );
    const columnUnit = unitBoxPriceForCount(prices, tier.boxes);
    const unit = perBoxPriceFromVariant(matched, tier.boxes) ?? columnUnit;
    if (unit == null || !(unit > 0)) return [];
    const savings =
      baseBoxPrice && tier.boxes > 1 && unit < baseBoxPrice
        ? Math.round(((baseBoxPrice - unit) / baseBoxPrice) * 100)
        : 0;
    const sku = String(
      handFilmTierSku({
        categorySlug: product?.categorySlug,
        series: product?.series,
        partNumber: product?.partNumber || product?.part_number,
        title: product?.title || product?.name,
        sku: matched?.sku,
        widthInches,
        gauge,
        lengthFeet,
        boxes: tier.boxes,
      }) ||
        matched?.sku ||
        `${baseSku}-${tier.boxes}BX`
    );
    const houston = houstonFridayPresetLabel(catalogBoxes, catalogRolls);
    const gross = packageTotalWeightLbs({
      rolls: tier.rolls,
      boxes: tier.boxes,
      rollWeightLbs: Number(matched?.rollWeightLbs) || sharedRollWeight,
      boxWeightLbs: Number(matched?.boxWeightLbs) || sharedBoxWeight,
      palletWeightLbs: Number(matched?.palletWeightLbs) || sharedPalletWeight,
      widthInches,
      gauge,
      lengthFeet,
    });
    return [
      {
        id: matched?.id || sku,
        sku,
        tierKey: tier.key,
        packageSize: tier.title,
        title: tier.title,
        tierSubtext: houston
          ? `${houston} ${HAND_PALLET_WEIGHT_NOTE}`
          : tier.subtext,
        tierBadges: savings > 0 ? [`Save ${savings}% OFF`] : [],
        tierTag: tier.boxes >= 64 && savings > 0 ? "BEST VALUE" : "",
        boxUnitPrice: unit,
        priceUsd: unit.toFixed(2),
        price: unit,
        rollsPerBox: tier.rolls,
        rolls_count: tier.rolls,
        rollsCount: tier.rolls,
        boxes_count: tier.boxes,
        boxesCount: tier.boxes,
        rollsPerPallet: 256,
        widthInches,
        gauge,
        lengthFeet,
        weightLbs: gross != null && gross > 0 ? String(gross) : "",
        stockStatus: "in_stock",
        createdAt: new Date().toISOString(),
      },
    ];
  });
}

function displayPackageTitle(variant: any, isMachine: boolean): string {
  const raw = String(variant?.title || variant?.packageSize || variant?.sku || "");
  if (isMachine) {
    return normalizeMachinePackageLabel(getRollsCount(variant), raw);
  }

  const kind = getPackageTierKind(variant, false);
  const rolls = Math.max(0, getRollsCount(variant));
  const boxes = getBoxesCount(variant, false);
  if (kind === "full_pallet" || boxes === 64) {
    return "Full Pallet (Includes pallet & packaging)";
  }
  if (boxes > 0) {
    const rollCount = rolls > 0 ? rolls : boxes * 4;
    return formatBoxRollLabel(boxes, rollCount);
  }
  if (kind === "single_unit") return "1 Box (4 Rolls)";
  if (rolls > 0) return `${rolls} Rolls`;
  return raw;
}

function displayPackageSubtext(variant: any, isMachine: boolean): string {
  const rolls = Math.max(0, getRollsCount(variant));
  if (isMachine) {
    const tierKind = getPackageTierKind(variant, true);
    if (tierKind === "fixed_half" || rolls === 20) return "20 Rolls";
    if (tierKind === "full_pallet" || rolls === 40) return "40 Rolls";
    return "";
  }

  const boxes = Number(variant?.boxes_count ?? variant?.boxesCount ?? 0);
  const catalogRolls = Number(variant?.rolls_count ?? variant?.rollsCount ?? variant?.rolls ?? 0);
  const houston = houstonFridayPresetLabel(boxes, catalogRolls);
  const kind = getPackageTierKind(variant, false);
  const palletNote = boxes >= 16 || kind === "full_pallet" || kind === "fixed_half" || kind === "fixed_mid"
    ? ` ${HAND_PALLET_WEIGHT_NOTE}`
    : "";
  if (houston) return `${houston}${palletNote}`;
  if (kind === "full_pallet" || boxes === 64 || rolls === 256) {
    return `64 Boxes · 256 Rolls.${palletNote}`;
  }
  if (rolls === 128 || boxes === 32) return `128 Rolls included.${palletNote}`;
  if (kind === "fixed_mid" || rolls === 64 || boxes === 16) {
    return `64 Rolls included · Free RGV Freight Eligible.${palletNote}`;
  }
  if (kind === "single_unit" || boxes === 1) {
    const rollCount = rolls > 0 ? rolls : 4;
    return rollCount === 4
      ? "4 Rolls included · Standard package"
      : `${rollCount} Rolls included`;
  }
  return rolls > 0 ? `${rolls} Rolls included` : "";
}

interface VariantSelectorProps {
  product: any;
  selectedVariantId?: string;
  selectedVariant?: any;
  onVariantChange?: (variant: any) => void;
  [key: string]: any;
}

export function VariantSelector({
  product: initialProduct,
  selectedVariantId: propSelectedVariantId,
  selectedVariant: propSelectedVariant,
  onVariantChange,
}: VariantSelectorProps) {
  const [product, setProduct] = useState(initialProduct);
  useEffect(() => {
    setProduct(initialProduct);
  }, [initialProduct]);
  useEffect(() => {
    const slug = String(initialProduct?.slug || "");
    if (!slug) return;
    let cancelled = false;
    getProductBySlug(slug).then((fresh) => {
      if (!cancelled && fresh) setProduct(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, [initialProduct?.slug]);
  const { t } = useLanguage();
  const isMachineFilm = detectMachineFilm(product);
  const unitLabel = unitLabelForProduct(isMachineFilm);
  const unitLabelPlural = isMachineFilm ? "Rolls" : "Boxes";

  // Prefer configured package tiers when they carry real prices; otherwise use SKU variants.
  const variants = useMemo(() => {
    if (isMachineFilm) return buildMachineFilmSelectorTiers(product);

    const mapped = (() => {
      if (product?.packageOptions?.length) {
        return product.packageOptions
          .map((opt: any) => {
            const perBox = Number(opt?.boxUnitPrice);
            const stored = Number(opt?.price);
            const price = perBox > 0 ? perBox : stored;
            if (!Number.isFinite(price) || price <= 0) return null;
            const rolls = Number(opt?.rolls) || 1;
            const keepStoredLabel = usesCompact1880Pallets({
              widthInches: product?.width_inches || product?.widthInches,
              gauge: product?.gauge,
              lengthFeet: product?.length_feet || product?.lengthFeet,
              slug: product?.slug,
              name: product?.title || product?.name,
            });
            if (isMachineFilm && rolls !== 20 && rolls !== 40) return null;
            const label = isMachineFilm
              ? normalizeMachinePackageLabel(rolls, opt?.label)
              : opt?.label;
            return {
              id: opt.sku,
              sku: opt.sku,
              packageSize: label,
              title: label,
              priceUsd: String(price),
              price,
              boxUnitPrice: price,
              boxes: Number(opt?.boxes) > 0 ? Number(opt.boxes) : undefined,
              rollsPerBox: rolls,
              rollsPerPallet: product?.fullPalletRolls || (isMachineFilm ? 40 : 192),
              widthInches:
                product?.width_inches ||
                product?.widthInches ||
                (isMachineFilm ? "20.00" : "18.00"),
              gauge: product?.gauge || 60,
              lengthFeet: product?.length_feet || product?.lengthFeet || 1000,
              weightLbs: "",
              stockStatus: "in_stock",
              createdAt: new Date().toISOString(),
              rolls_count: rolls,
              boxes_count: isMachineFilm
                ? 0
                : keepStoredLabel
                  ? Math.max(1, Math.round(rolls / 4))
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
          if (!isMachineFilm) return v;
          const rolls = getRollsCount(v);
          const canonicalRolls = rolls === 20 || rolls === 40 ? rolls : 0;
          if (!canonicalRolls) return null;
          const label = normalizeMachinePackageLabel(canonicalRolls, v.title || v.packageSize);
          const normalizedRolls = canonicalRolls;
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
        .filter(Boolean);
    })();

    return buildStandardHandTiers(product, mapped);
  }, [product, isMachineFilm]);

  const addItem = useCartStore((state) => state.addItem);
  const setAppliedCoupon = useCartStore((state) => state.setAppliedCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);

  const [internalSelectedVariantId, setInternalSelectedVariantId] = useState<string>(() => {
    if (!isMachineFilm) {
      const full = variants.find(
        (variant: any) =>
          variant?.tierKey === "full" || getBoxesCount(variant, false) === HAND_FULL_PALLET_BOXES
      );
      if (full) return String(full.id || full.sku || full.tierKey);
    }
    return String(variants[0]?.id || variants[0]?.sku || "0");
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState(false);
  const [tierHint, setTierHint] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

  const handleDiscountApplied = useCallback(
    (discount: AppliedDiscount | null) => {
      setAppliedDiscount(discount);
      if (discount && discount.discountType === "percentage") {
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
    if (isMachineFilm) {
      const parentRolls = getRollsCount(propSelectedVariant);
      const wanted = parentRolls === 40 ? 40 : 20;
      return variants.find((variant: any) => getRollsCount(variant) === wanted) || variants[0];
    }
    if (!isMachineFilm && variants[0]?.tierKey) {
      const byInternal = variants.find((variant: any) => {
        const id = String(variant.id || variant.sku || "");
        return (
          id === internalSelectedVariantId || variant.tierKey === internalSelectedVariantId
        );
      });
      if (byInternal) return byInternal;
      const sourceKey = propSelectedVariant?.tierKey;
      if (sourceKey) {
        return variants.find((variant: any) => variant.tierKey === sourceKey) || variants[0];
      }
      const sourceBoxes = propSelectedVariant
        ? getBoxesCount(propSelectedVariant, false)
        : 0;
      return (
        variants.find((variant: any) => getBoxesCount(variant, false) === sourceBoxes) ||
        variants[0]
      );
    }
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
  }, [variants, propSelectedVariant, propSelectedVariantId, internalSelectedVariantId, isMachineFilm]);

  const selectedVariantId =
    propSelectedVariantId ||
    propSelectedVariant?.id ||
    propSelectedVariant?.sku ||
    selectedVariant?.id ||
    selectedVariant?.sku ||
    internalSelectedVariantId;

  const packageTier = getPackageTierKind(selectedVariant, isMachineFilm);
  const tierKey = String(selectedVariant?.tierKey || "").toLowerCase();
  const tierLabel = getVariantLabel(selectedVariant);
  const isFullPalletTier =
    packageTier === "full_pallet" || tierKey === "full" || tierLabel.includes("FULL PALLET");
  const isHalfPalletTier =
    !isFullPalletTier &&
    (packageTier === "fixed_half" ||
      tierKey === "half" ||
      tierLabel.includes("HALF PALLET"));
  const isLayerTier =
    !isFullPalletTier &&
    !isHalfPalletTier &&
    (packageTier === "fixed_mid" ||
      tierKey === "layer" ||
      tierLabel.includes("1 LAYER") ||
      tierLabel.includes("LAYER") ||
      tierLabel.includes("16 BOX"));
  const isSingleUnitTier =
    !isFullPalletTier &&
    !isHalfPalletTier &&
    !isLayerTier &&
    (packageTier === "single_unit" ||
      tierKey === "box" ||
      tierLabel.includes("1 BOX") ||
      getRollsCount(selectedVariant) === 4);
  const isPalletPackage =
    packageTier === "fixed_mid" ||
    packageTier === "fixed_half" ||
    packageTier === "full_pallet";
  const packageBoxes = getBoxesCount(selectedVariant, isMachineFilm);
  const packageRolls = getRollsCount(selectedVariant);
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

  useEffect(() => {
    if (!isMachineFilm || !onVariantChange) return;
    const half = variants.find((variant: any) => getRollsCount(variant) === 20) || variants[0];
    if (!half) return;
    const parentRolls = getRollsCount(propSelectedVariant);
    if (parentRolls === 20 || parentRolls === 40) return;
    onVariantChange(half);
    setInternalSelectedVariantId(String(half.id || half.sku));
  }, [isMachineFilm, variants, propSelectedVariant, onVariantChange]);

  useEffect(() => {
    if (isMachineFilm || !selectedVariant?.tierKey || !onVariantChange) return;
    const parentKey = propSelectedVariant?.tierKey;
    const parentPrice = getVariantPrice(propSelectedVariant);
    const nextPrice = getVariantPrice(selectedVariant);
    if (parentKey === selectedVariant.tierKey && parentPrice === nextPrice) return;
    onVariantChange(selectedVariant);
  }, [isMachineFilm, selectedVariant, propSelectedVariant, onVariantChange]);

  const handleSwitchToMidTier = () => {
    if (!midTierVariant) return;
    selectVariant(midTierVariant, 1);
    setTierHint(`Switched to 16 ${unitLabelPlural} package for better bulk pricing.`);
  };

  const parsedPackagePrice = parseFloat(
    String(selectedVariant?.priceUsd ?? (selectedVariant as any)?.price ?? "")
  );
  const listBoxUnit = !isMachineFilm
    ? perBoxPriceFromVariant(selectedVariant, packageBoxes) || 0
    : 0;
  const listPackageUnit = isMachineFilm
    ? Number.isFinite(parsedPackagePrice) && parsedPackagePrice > 0
      ? parsedPackagePrice
      : Number(product?.startingPrice) > 0
        ? Number(product.startingPrice)
        : 0
    : listBoxUnit > 0 && packageBoxes > 0
      ? totalForBoxes(listBoxUnit, packageBoxes)
      : 0;
  const discountedBoxUnit = listBoxUnit > 0 ? applyDiscountToPrice(listBoxUnit, appliedDiscount) : 0;
  const unitPrice = isMachineFilm
    ? applyDiscountToPrice(listPackageUnit, appliedDiscount)
    : listBoxUnit > 0
      ? totalForBoxes(discountedBoxUnit, packageBoxes)
      : 0;
  const baseUnitPriceRaw = listPackageUnit;
  const machineRollStep = isMachineFilm ? (packageRolls >= 40 ? 40 : 20) : 0;
  const quantityLocked = !isMachineFilm && (isHalfPalletTier || isLayerTier);
  const isBoxTier = isSingleUnitTier && !isMachineFilm;
  const quantityMax = quantityLocked ? 1 : isBoxTier ? 15 : undefined;
  const effectiveQuantity = quantityLocked
    ? 1
    : isBoxTier
      ? Math.min(15, Math.max(1, Math.floor(quantity) || 1))
      : Math.max(1, Math.floor(quantity) || 1);
  const lineBoxes = isMachineFilm ? 0 : packageBoxes * effectiveQuantity;
  const totalPrice = isMachineFilm
    ? Number((unitPrice * effectiveQuantity).toFixed(2))
    : totalForBoxes(discountedBoxUnit, lineBoxes);
  const hasActiveDiscount = Boolean(appliedDiscount && baseUnitPriceRaw > 0);
  const quantityNoun = isMachineFilm
    ? "Rolls"
    : isLayerTier
      ? "Layers"
      : isHalfPalletTier
        ? "Half Pallets"
        : isFullPalletTier
          ? "Full Pallets"
          : "Boxes";
  const quantitySingular =
    quantityNoun === "Full Pallets"
      ? "full pallet"
      : quantityNoun === "Half Pallets"
        ? "half pallet"
        : quantityNoun === "Layers"
          ? "layer"
          : quantityNoun === "Rolls"
            ? "roll"
            : "box";
  const incrementNote = isMachineFilm
    ? `Sold by the roll. Minimum ${machineRollStep} rolls. Each step adds ${machineRollStep} rolls.`
    : isFullPalletTier
      ? `Each step adds 1 full pallet (${packageBoxes} boxes).`
      : null;
  const displayedQuantity = isMachineFilm ? effectiveQuantity * machineRollStep : effectiveQuantity;

  const selectedTierIdentity = `${tierKey}:${selectedVariant?.id || selectedVariant?.sku || ""}`;

  useEffect(() => {
    setQuantity(1);
    setTierHint(null);
  }, [selectedTierIdentity]);

  useEffect(() => {
    if (quantityLocked && quantity !== 1) setQuantity(1);
    if (isBoxTier && quantity > 15) setQuantity(15);
  }, [quantityLocked, isBoxTier, quantity]);

  const handleQuantityDecrease = () => {
    if (quantityLocked) return;
    setQuantity((prev) => Math.max(1, Math.floor(prev) - 1));
    setTierHint(null);
  };

  const handleQuantityInput = (raw: string) => {
    const next = Math.floor(Number(raw));
    if (!Number.isFinite(next)) return;
    if (isMachineFilm) {
      const step = packageRolls >= 40 ? 40 : 20;
      const rolls = Math.floor(Number(raw));
      if (!Number.isFinite(rolls)) return;
      setQuantity(Math.max(1, Math.round(rolls / step)));
      setTierHint(null);
      return;
    }
    if (quantityLocked) {
      setQuantity(1);
      return;
    }
    if (isBoxTier && next > 15) {
      setQuantity(15);
      setTierHint(BOX_QTY_NOTE);
      toast.error(BOX_QTY_NOTE);
      return;
    }
    setQuantity(Math.max(1, next || 1));
    setTierHint(null);
  };

  const handleQuantityIncrease = () => {
    if (quantityLocked) return;
    if (isBoxTier) {
      if (quantity >= 15) {
        setTierHint(BOX_QTY_NOTE);
        setQuantity(15);
        toast.error(BOX_QTY_NOTE);
        return;
      }
      setQuantity((prev) => Math.min(15, Math.floor(prev) + 1));
      setTierHint(null);
      return;
    }

    setQuantity((prev) => Math.floor(prev) + 1);
    setTierHint(null);
  };

  const handlePackageSelect = (variant: any) => {
    selectVariant(variant, 1);
    setTierHint(null);
  };

  const isSoldOut = !isCatalogInStock({
    isSoldOut: product?.isSoldOut,
    isAvailable: (product as { isAvailable?: boolean | null } | null | undefined)?.isAvailable,
    stockQuantity: product?.stockQuantity,
  });
  const palletCount = Number(product?.stockQuantity) || 0;
  const boxesPerPallet = boxesPerPalletForProduct({
    application: product?.application,
    widthInches: product?.widthInches ?? product?.width_inches,
    gauge: product?.gauge,
    lengthFeet: product?.length_feet ?? product?.lengthFeet,
    slug: product?.slug,
    name: product?.name,
    boxesPerPallet: product?.boxesPerPallet,
  });
  const palletLabel =
    !isSoldOut && product?.stockBoxes != null
      ? boxStockLabel(product.stockBoxes, boxesPerPallet)
      : !isSoldOut && palletCount > 0
        ? palletStockLabel(palletCount, boxesPerPallet)
        : null;

  const handleAddToCart = () => {
    if (isSoldOut) return;
    if (!product || !selectedVariant || baseUnitPriceRaw <= 0) return;
    const rolls = getRollsCount(selectedVariant);
    const packageBoxes = isMachineFilm ? 0 : getBoxesCount(selectedVariant, false);
    if (!isMachineFilm && packageBoxes === HAND_FULL_PALLET_BOXES) {
      const variant64 =
        (product.variants || []).find(
          (variant: any) =>
            Number(variant?.boxes_count ?? variant?.boxesCount) === HAND_FULL_PALLET_BOXES
        ) || selectedVariant;
      const line = buildHandFullPalletCartItem(product, {
        ...variant64,
        price: listBoxUnit,
        boxes_count: HAND_FULL_PALLET_BOXES,
      });
      if (!line) return;
      addItem({
        ...line,
        unitPrice:
          appliedDiscount?.discountType === "fixed" ? unitPrice : line.unitPrice,
        boxUnitPrice:
          appliedDiscount?.discountType === "fixed" ? discountedBoxUnit : line.boxUnitPrice,
        quantity: effectiveQuantity,
      });
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 2500);
      return;
    }

    // Percent codes sync to cart coupon — store list price to avoid double discount.
    // Fixed codes are applied at line level only (cart coupon is percent-based).
    const cartUnitPrice =
      appliedDiscount?.discountType === "fixed"
        ? unitPrice
        : baseUnitPriceRaw;
    const cartBoxUnit =
      appliedDiscount?.discountType === "fixed" ? discountedBoxUnit : listBoxUnit;

    const widthInches = String(
      selectedVariant?.widthInches ??
        product?.width_inches ??
        product?.widthInches ??
        "18.00"
    );
    const gauge = Number(
      selectedVariant?.gauge ?? product?.gauge ?? 60
    );
    const lengthFeet = Number(
      selectedVariant?.lengthFeet ?? product?.length_feet ?? 1000
    );

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.title || product.name || "Stretch Film",
      productImage: product.imageUrl || "",
      packageSize: displayPackageTitle(selectedVariant, isMachineFilm),
      totalRolls: isMachineFilm ? rolls * effectiveQuantity : rolls,
      totalBoxes: isMachineFilm ? 0 : getBoxesCount(selectedVariant, false),
      application: product.application === "machine" ? "machine" : "hand",
      variantId: selectedVariant.id,
      sku: selectedVariant.sku || "",
      widthInches,
      gauge: Number.isFinite(gauge) && gauge > 0 ? gauge : 60,
      lengthFeet: Number.isFinite(lengthFeet) && lengthFeet > 0 ? lengthFeet : 1000,
      rollsPerBox: Number(selectedVariant?.rollsPerBox) || rolls || 1,
      rollsPerPallet:
        Number(selectedVariant?.rollsPerPallet) ||
        Number(product?.fullPalletRolls) ||
        (isMachineFilm ? 40 : 192),
      weightLbs: Number(selectedVariant?.weightLbs) > 0 ? String(selectedVariant.weightLbs) : "",
      pricingTier: displayPackageTitle(selectedVariant, isMachineFilm),
      tierType: isHalfPalletTier
        ? "half_pallet"
        : isLayerTier
          ? "layer"
          : isSingleUnitTier
            ? "box"
            : isFullPalletTier
              ? "full_pallet"
              : undefined,
      unitPrice: cartUnitPrice,
      boxUnitPrice: isMachineFilm ? undefined : cartBoxUnit,
      quantity: effectiveQuantity,
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  if (!product) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Unable to load packaging options for this product.
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xl shadow-slate-200/40 md:block md:space-y-7 md:p-8">
      {/* Dynamic Price Header */}
      <div className="pb-5 border-b border-slate-100 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold block mb-1">
            {t("products.officialFactoryDirectPrice")}
          </span>
          <div className="flex items-baseline gap-2 flex-wrap">
            {isMachineFilm ? (
              <>
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
                {Number((selectedVariant as { perRollPrice?: number })?.perRollPrice) > 0 && (
                  <span className="basis-full text-sm font-semibold text-slate-500">
                    {formatCurrency(
                      Number((selectedVariant as { perRollPrice?: number }).perRollPrice)
                    )}{" "}
                    USD / roll
                  </span>
                )}
              </>
            ) : (
              <>
                {hasActiveDiscount && listPackageUnit !== unitPrice && (
                  <span className="text-lg sm:text-xl font-bold text-slate-400 line-through tracking-tight">
                    {formatCurrency(listPackageUnit)}
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
                {discountedBoxUnit > 0 && (
                  <span className="basis-full text-sm font-semibold text-slate-500">
                    {formatCurrency(discountedBoxUnit)} USD / box
                  </span>
                )}
              </>
            )}
            {appliedDiscount && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                {formatDiscountAppliedBadge(appliedDiscount)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isSoldOut ? "secondary" : "success"}
            className="text-xs font-semibold px-3 py-1"
          >
            ● {isSoldOut ? t("products.soldOut") : palletLabel || t("products.inStock")}
          </Badge>
        </div>
      </div>

      {/* Package Size Pill Selector */}
      <div className="order-1 space-y-3 md:order-none" data-tour="product-price-tiers">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            {t("products.packageOptions")}
          </label>
          <span className="text-xs font-semibold text-blue-700">
            {displayPackageTitle(selectedVariant, isMachineFilm)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5" role="radiogroup" aria-label="Package options">
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
            const boxesCount = getBoxesCount(variant, isMachineFilm);
            const optionBoxUnit = !isMachineFilm
              ? perBoxPriceFromVariant(variant, boxesCount) || 0
              : 0;
            const optionBoxUnitDiscounted =
              optionBoxUnit > 0 ? applyDiscountToPrice(optionBoxUnit, appliedDiscount) : 0;
            const variantTitle = variant?.tierKey
              ? String(variant.title)
              : displayPackageTitle(variant, isMachineFilm);
            const rollsCount = getRollsCount(variant);
            const tierBadges: string[] = Array.isArray(variant?.tierBadges)
              ? variant.tierBadges
              : [];
            const tierTag = String(variant?.tierTag || "");
            const tierSubtext = String(
              variant?.tierSubtext || displayPackageSubtext(variant, isMachineFilm)
            );
            const { savingsPercent, unitCount } = getPackageSavings(
              variant,
              baseUnitPrice,
              isMachineFilm
            );
            const pricedUnitCount = isMachineFilm
              ? Math.max(1, rollsCount)
              : Math.max(1, boxesCount);
            const showSavings =
              !variant?.tierKey &&
              tierBadges.length === 0 &&
              !tierTag &&
              savingsPercent > 0 &&
              unitCount > 1;
            const showDiscountStrike =
              Boolean(appliedDiscount) && originalPrice > 0 && price < originalPrice;
            const discountBadgeClass =
              "bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full";

            return (
              <button
                key={
                  variant.id ||
                  variant.sku ||
                  `variant-${variant.rollsCount || (variant as any).rolls_count}-${index}`
                }
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handlePackageSelect(variant)}
                className={`group relative flex w-full cursor-pointer flex-col items-stretch rounded-xl p-4 text-left transition ${
                  isSelected
                    ? "border-2 border-blue-600 bg-blue-50/30 shadow-sm"
                    : "border border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-300 bg-white group-hover:border-slate-400"
                      }`}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-bold sm:text-sm ${
                            isSelected ? "text-slate-900" : "text-slate-700"
                          }`}
                        >
                          {variantTitle}
                        </span>
                        {tierTag && <span className={discountBadgeClass}>{tierTag}</span>}
                        {tierBadges.map((badge) => (
                          <span key={badge} className={discountBadgeClass}>
                            {badge}
                          </span>
                        ))}
                        {showSavings && (
                          <span className={discountBadgeClass}>Save {savingsPercent}% OFF</span>
                        )}
                      </div>
                      <span className="mt-0.5 block text-[11px] text-slate-500">
                        {tierSubtext}
                      </span>
                    </div>
                  </div>

                  <div className="ml-auto shrink-0 text-right">
                    {isMachineFilm ? (
                      <>
                        {showDiscountStrike && (
                          <span className="block text-xs font-semibold text-slate-400 line-through">
                            {formatCurrency(originalPrice)} USD
                          </span>
                        )}
                        <p
                          className={`whitespace-nowrap text-sm font-extrabold sm:text-base ${
                            showDiscountStrike ? "text-emerald-700" : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(price)} USD
                        </p>
                        {price > 0 && pricedUnitCount > 0 && (
                          <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500">
                            {formatCurrency(
                              Number(variant?.perRollPrice) > 0
                                ? Number(variant.perRollPrice)
                                : price / pricedUnitCount
                            )}{" "}
                            USD / roll
                          </p>
                        )}
                      </>
                    ) : optionBoxUnitDiscounted > 0 && boxesCount > 0 ? (
                      <>
                        {optionBoxUnit !== optionBoxUnitDiscounted && (
                          <span className="block text-xs font-semibold text-slate-400 line-through">
                            {formatCurrency(totalForBoxes(optionBoxUnit, boxesCount))} USD
                          </span>
                        )}
                        <p
                          className={`whitespace-nowrap text-sm font-extrabold sm:text-base ${
                            optionBoxUnit !== optionBoxUnitDiscounted
                              ? "text-emerald-700"
                              : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(totalForBoxes(optionBoxUnitDiscounted, boxesCount))} USD
                        </p>
                        <p className="mt-0.5 whitespace-nowrap text-[11px] font-semibold text-slate-500">
                          {formatCurrency(optionBoxUnitDiscounted)} USD / box
                        </p>
                      </>
                    ) : (
                      <p className="text-sm font-extrabold text-slate-400">—</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="order-2 hidden md:block">
        <ProductDiscountInput
          appliedDiscount={appliedDiscount}
          onApplied={handleDiscountApplied}
        />
      </div>

      {/* Specifications sit below the action buttons on mobile */}
      <div className="order-5 space-y-2 md:order-none" data-tour="product-specs">
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

        const coreType = String(
          (product as any)?.core_type ||
            (product as any)?.coreType ||
            'Standard 3" Core'
        );

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
                <span className="font-bold text-slate-900">{gaugeVal ?? "—"} Gauge</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {t("products.length")}
                </span>
                <span className="font-bold text-slate-900">
                  {formatLocaleNumber(lengthVal, "1,000")} Feet
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
      </div>

      {/* Quantity and subtotal, directly above the action buttons */}
      <div className="order-3 border-t border-slate-100 pt-2 md:order-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-bold uppercase">
                {t("products.quantity")} ({quantityNoun}):
              </span>
            </div>

            <div className="inline-flex w-36 max-w-[140px] shrink-0 items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={handleQuantityDecrease}
                disabled={effectiveQuantity <= 1 || quantityLocked}
                aria-label={
                  isMachineFilm
                    ? `Remove ${machineRollStep} rolls`
                    : `Remove 1 ${quantitySingular}`
                }
                className="h-8 w-8 shrink-0 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 font-bold disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent"
              >
                -
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={isMachineFilm ? machineRollStep : 1}
                max={quantityMax}
                step={isMachineFilm ? machineRollStep : 1}
                readOnly={quantityLocked}
                value={displayedQuantity}
                onChange={(event) => handleQuantityInput(event.target.value)}
                aria-live="polite"
                aria-label={`Quantity of ${quantitySingular}`}
                className="min-w-0 w-8 flex-1 border-0 bg-transparent text-center text-sm font-bold text-slate-900 tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={handleQuantityIncrease}
                disabled={quantityLocked}
                aria-label={
                  isMachineFilm ? `Add ${machineRollStep} rolls` : `Add 1 ${quantitySingular}`
                }
                className="h-8 w-8 shrink-0 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 font-bold disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent"
              >
                +
              </button>
            </div>
            {isHalfPalletTier && !isMachineFilm && (
              <p className="max-w-[220px] text-[10px] font-medium leading-snug text-amber-800">
                {HALF_PALLET_QTY_NOTE}
              </p>
            )}
            {isLayerTier && (
              <p className="max-w-[220px] text-[10px] font-medium leading-snug text-amber-800">
                {LAYER_LIMIT_NOTE}
              </p>
            )}
            {incrementNote && (
              <p className="max-w-[220px] text-[10px] font-medium leading-snug text-slate-500">
                {incrementNote}
              </p>
            )}

            {isSingleUnitTier && !isMachineFilm && quantity >= 15 && (
              <p className="max-w-[220px] text-[10px] font-medium leading-snug text-amber-800">
                {BOX_QTY_NOTE}
              </p>
            )}
            {tierHint && (
              <p className="max-w-[220px] text-[10px] font-medium leading-snug text-sky-700">
                {tierHint}
              </p>
            )}
          </div>

          <div className="shrink-0 self-start text-right">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">
              {t("products.subtotal")}
            </span>
            {!isMachineFilm && discountedBoxUnit > 0 && lineBoxes > 0 && (
              <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                {formatCurrency(discountedBoxUnit)} USD / box
              </span>
            )}
            {hasActiveDiscount && (
              <span className="text-sm font-semibold text-slate-400 line-through block">
                {formatCurrency(
                  isMachineFilm
                    ? Number((baseUnitPriceRaw * effectiveQuantity).toFixed(2))
                    : totalForBoxes(listBoxUnit, lineBoxes)
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
      </div>

      {/* Actions */}
      <div className="order-4 space-y-3 pt-1 md:order-none md:space-y-4 md:pt-2">
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
                <span className="font-bold text-slate-900">16 Boxes (64 Rolls)</span> package
                offers better bulk pricing and lower unit cost.
              </p>
              <button
                type="button"
                onClick={handleSwitchToMidTier}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 underline underline-offset-2 decoration-blue-300 hover:decoration-blue-500 transition-colors cursor-pointer"
              >
                Switch to 16 Boxes (64 Rolls) →
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2.5 pt-1" data-tour="product-add-to-cart">
          <Button
            type="button"
            onClick={handleAddToCart}
            variant={isSoldOut ? "secondary" : "gradient"}
            size="lg"
            disabled={isSoldOut || baseUnitPriceRaw <= 0}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold md:py-6 ${
              isSoldOut
                ? "bg-slate-300 text-slate-500 shadow-none cursor-not-allowed hover:bg-slate-300"
                : "shadow-lg shadow-sky-500/20"
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isSoldOut ? t("products.soldOut") : t("products.addToCart")}</span>
          </Button>

          <DirectCheckoutButton
            label={isSoldOut ? t("products.soldOut") : t("products.directCheckout")}
            disabled={isSoldOut || baseUnitPriceRaw <= 0}
            className={
              isSoldOut || baseUnitPriceRaw <= 0
                ? "!bg-slate-300 !bg-none !text-slate-500 !shadow-none cursor-not-allowed"
                : undefined
            }
            onBeforeNavigate={() => {
              if (isSoldOut || baseUnitPriceRaw <= 0) return false;
              handleAddToCart();
            }}
          />
        </div>
      </div>

      {addedNotice && (
        <div className="order-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 shadow-sm animate-fade-in-up md:order-none">
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
