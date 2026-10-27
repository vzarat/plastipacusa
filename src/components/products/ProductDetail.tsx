"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { trackViewContent } from "@/lib/meta-pixel";
import { ProductWithVariants, ProductVariant } from "@/types";
import { VariantSelector } from "@/components/products/VariantSelector";
import { buildMachineFilmSelectorTiers, isMachineFilm } from "@/lib/products";
import {
  HAND_FULL_PALLET_BOXES,
  HAND_FULL_PALLET_ROLLS,
  HAND_ROLLS_PER_BOX,
} from "@/lib/pricing";
import { PhoneCall } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

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

  if (isMachineFilm(product)) {
    return buildMachineFilmSelectorTiers(product)[0];
  }

  const packageOptions = product.packageOptions || [];
  const fullPackage =
    packageOptions.find((option) => Number(option.boxes) === HAND_FULL_PALLET_BOXES) ||
    packageOptions.find((option) => Number(option.rolls) === HAND_FULL_PALLET_ROLLS);
  if (fullPackage) {
    const unit =
      Number(fullPackage.boxUnitPrice) > 0
        ? Number(fullPackage.boxUnitPrice)
        : Number(fullPackage.price) || 0;
    return {
      id: fullPackage.sku,
      sku: fullPackage.sku,
      tierKey: "full",
      packageSize: fullPackage.label,
      title: fullPackage.label,
      price: unit,
      boxUnitPrice: unit,
      boxes: HAND_FULL_PALLET_BOXES,
      boxes_count: HAND_FULL_PALLET_BOXES,
      boxesCount: HAND_FULL_PALLET_BOXES,
      rollsPerBox: HAND_ROLLS_PER_BOX,
      rolls_count: HAND_FULL_PALLET_ROLLS,
      rollsCount: HAND_FULL_PALLET_ROLLS,
      widthInches,
      gauge,
      lengthFeet,
      rollsPerPallet: HAND_FULL_PALLET_ROLLS,
      weightLbs: "",
    };
  }

  if (product.variants?.length) {
    return (
      product.variants.find(
        (variant) => Number(variant.boxes_count ?? variant.boxesCount) === HAND_FULL_PALLET_BOXES
      ) ||
      product.variants.find(
        (variant) => Number(variant.rolls_count ?? variant.rollsCount) === HAND_FULL_PALLET_ROLLS
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
      rollsPerPallet: HAND_FULL_PALLET_ROLLS,
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

  const viewedSku = useRef("");
  useEffect(() => {
    const sku = String(selectedVariant?.sku || product?.partNumber || "");
    if (!sku || viewedSku.current === sku) return;
    viewedSku.current = sku;
    const price = Number(selectedVariant?.boxUnitPrice ?? selectedVariant?.price ?? product?.startingPrice) || 0;
    trackViewContent({
      sku,
      price,
      currency: "USD",
      name: product?.title || product?.name || "",
    });
  }, [product, selectedVariant]);

  if (!product) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Product details are unavailable. Please return to the catalog and try
        another item.
      </div>
    );
  }

  const title = product?.title || product?.name || "Stretch Film";

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
            <strong className="text-slate-900">(956) 400 36 83</strong>
          </span>
        </div>
        <a
          href="tel:+19564003683"
          className="font-bold text-sky-600 hover:text-sky-700 transition-colors"
        >
          {t("products.callSpecialist")}
        </a>
      </div>
    </div>
  );
}
