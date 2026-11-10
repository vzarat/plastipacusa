"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { trackViewContent } from "@/lib/meta-pixel";
import { ProductWithVariants, ProductVariant } from "@/types";
import { VariantSelector } from "@/components/products/VariantSelector";
import { isMachineFilm } from "@/lib/products";
import { HAND_ROLLS_PER_BOX } from "@/lib/pricing";
import {
  buildHandManualPackageTiers,
  handFullPalletBoxes,
} from "@/lib/hand-package-tiers";
import { PhoneCall } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { isCatalogInStock } from "@/lib/products";
import { OutOfStockCallout } from "@/components/products/OutOfStockCallout";
import { PRIMARY_PHONE_DISPLAY, PRIMARY_PHONE_HREF } from "@/lib/company-contact";

interface ProductDetailProps {
  product: ProductWithVariants;
}

function buildInitialVariant(product: ProductWithVariants): ProductVariant | any {
  const widthSource = product?.width_inches ?? product?.widthInches;
  const widthInches =
    widthSource != null && String(widthSource).trim() !== "" ? String(widthSource) : undefined;
  const gaugeValue = Number(product?.gauge);
  const gauge = Number.isFinite(gaugeValue) && gaugeValue > 0 ? gaugeValue : undefined;
  const lengthValue = Number(product?.length_feet);
  const lengthFeet = Number.isFinite(lengthValue) && lengthValue > 0 ? lengthValue : undefined;

  // Machine film is not sold on the Manual-only storefront.
  if (isMachineFilm(product)) {
    return null;
  }

  const layout = {
    boxesPerPallet: (product as { boxesPerPallet?: number | null }).boxesPerPallet,
    widthInches: product?.widthInches ?? product?.width_inches,
    gauge: product?.gauge,
    lengthFeet: product?.lengthFeet ?? product?.length_feet,
    slug: product?.slug,
    name: product?.title || product?.name,
    title: product?.title || product?.name,
    application: "hand" as const,
  };
  const fullBoxes = handFullPalletBoxes(layout);
  const fullTier = buildHandManualPackageTiers(layout).find((tier) => tier.key === "full");
  const fullRolls = fullTier?.rolls || fullBoxes * HAND_ROLLS_PER_BOX;

  const packageOptions = product.packageOptions || [];
  const fullPackage =
    packageOptions.find((option) => Number(option.boxes) === fullBoxes) ||
    packageOptions.find((option) => Number(option.rolls) === fullRolls);
  if (fullPackage) {
    const unit =
      Number(fullPackage.boxUnitPrice) > 0
        ? Number(fullPackage.boxUnitPrice)
        : Number(fullPackage.price) || 0;
    return {
      id: fullPackage.sku,
      sku: fullPackage.sku,
      tierKey: "full",
      packageSize: fullPackage.label || fullTier?.title,
      title: fullPackage.label || fullTier?.title,
      price: unit,
      boxUnitPrice: unit,
      boxes: fullBoxes,
      boxes_count: fullBoxes,
      boxesCount: fullBoxes,
      rollsPerBox: HAND_ROLLS_PER_BOX,
      rolls_count: fullRolls,
      rollsCount: fullRolls,
      widthInches,
      gauge,
      lengthFeet,
      rollsPerPallet: fullRolls,
      weightLbs: "",
    };
  }

  if (product.variants?.length) {
    return (
      product.variants.find(
        (variant) => Number(variant.boxes_count ?? variant.boxesCount) === fullBoxes
      ) ||
      product.variants.find(
        (variant) => Number(variant.rolls_count ?? variant.rollsCount) === fullRolls
      ) ||
      product.variants[0]
    );
  }

  if (product.startingPrice && product.startingPrice > 0) {
    return {
      id: `${product.slug}-base`,
      sku: product.partNumber || product.slug,
      packageSize: "BASE UNIT",
      title: "BASE UNIT",
      price: product.startingPrice,
      rollsPerBox: HAND_ROLLS_PER_BOX,
      widthInches,
      gauge,
      lengthFeet,
      rollsPerPallet: fullRolls,
      weightLbs: "",
    };
  }

  return product.variants?.[0];
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { t } = useLanguage();

  const initialVariant = useMemo(
    () => (product ? buildInitialVariant(product) : undefined),
    [product]
  );
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | any>(
    initialVariant
  );

  useEffect(() => {
    setSelectedVariant(initialVariant);
  }, [initialVariant]);

  const viewedProductId = useRef("");
  useEffect(() => {
    if (!product) return;
    const productKey = String(product.id || product.slug || "");
    if (!productKey || viewedProductId.current === productKey) return;
    const sku = String(initialVariant?.sku || "").trim();
    if (!sku) return;
    viewedProductId.current = productKey;
    const boxes = Number(initialVariant?.boxes ?? initialVariant?.boxes_count ?? initialVariant?.boxesCount) || 0;
    const boxUnit = Number(initialVariant?.boxUnitPrice) || 0;
    const packagePrice = Number(initialVariant?.price) || Number(product.startingPrice) || 0;
    const value =
      boxes > 1 && boxUnit > 0 ? Math.round(boxUnit * boxes * 100) / 100 : Math.round(packagePrice * 100) / 100;
    trackViewContent({
      sku,
      price: value,
      currency: "USD",
      name: product.title || product.name || "",
      eventID: `ViewContent:${productKey}:${sku}`,
    });
  }, [product, initialVariant]);

  if (!product) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Product details are unavailable. Please return to the catalog and try
        another item.
      </div>
    );
  }

  const title = product?.title || product?.name || "Stretch Film";
  const isSoldOut = !isCatalogInStock(product);

  return (
    <div className="space-y-3 md:space-y-6">
      {/* Product Title & Film Type Header — price lives only in VariantSelector card */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono uppercase text-sky-600 font-bold tracking-wider">
            {product?.brand || "Plastipac"} •{" "}
            {product?.filmType || "Cast Co-Extruded Multi-Layer"}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>

        {isSoldOut ? <OutOfStockCallout /> : null}

        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
          {product?.description ||
            "Industrial high-performance stretch film for secure pallet containment."}
        </p>
      </div>

      {/* Interactive Variant & Packaging Selector (single official price display) */}
      <VariantSelector
        product={product}
        selectedVariant={selectedVariant}
        onVariantChange={setSelectedVariant}
      />

      {/* Direct Tech Support CTA */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between text-xs shadow-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <PhoneCall className="w-4 h-4 text-sky-600" />
          <span>
            {t("products.needCustomSpecs")}{" "}
            <strong className="text-slate-900">{PRIMARY_PHONE_DISPLAY}</strong>
          </span>
        </div>
        <a
          href={PRIMARY_PHONE_HREF}
          className="font-bold text-sky-600 hover:text-sky-700 transition-colors"
        >
          {t("products.callSpecialist")}
        </a>
      </div>
    </div>
  );
}
