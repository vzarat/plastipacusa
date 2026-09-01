"use client";

import React, { useState, useMemo } from "react";
import { ProductWithVariants, ProductVariant } from "@/types";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency, formatRollDimensions, formatGauge } from "@/lib/utils";
import {
  ShoppingCart,
  Package,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VariantSelectorProps {
  product: ProductWithVariants;
}

export function VariantSelector({ product }: VariantSelectorProps) {
  const variants = product.variants;
  const addItem = useCartStore((state) => state.addItem);

  // Extract unique widths
  const widths = useMemo(() => {
    return Array.from(new Set(variants.map((v) => v.widthInches))).sort(
      (a, b) => parseFloat(a) - parseFloat(b)
    );
  }, [variants]);

  // Initial selected state
  const [selectedWidth, setSelectedWidth] = useState<string>(widths[0] || "18.00");

  // Available gauges for selected width
  const availableGauges = useMemo(() => {
    return Array.from(
      new Set(
        variants
          .filter((v) => v.widthInches === selectedWidth)
          .map((v) => v.gauge)
      )
    ).sort((a, b) => a - b);
  }, [variants, selectedWidth]);

  const [selectedGauge, setSelectedGauge] = useState<number>(
    availableGauges[0] || 80
  );

  // Sync selected gauge if previous selection is invalid for new width
  const currentVariant: ProductVariant = useMemo(() => {
    const match = variants.find(
      (v) => v.widthInches === selectedWidth && v.gauge === selectedGauge
    );
    if (match) return match;

    const fallbackMatch = variants.find((v) => v.widthInches === selectedWidth);
    return fallbackMatch || variants[0];
  }, [variants, selectedWidth, selectedGauge]);

  // Pricing tier state
  type Tier = "roll" | "case" | "pallet";
  const [selectedTier, setSelectedTier] = useState<Tier>("case");
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState(false);

  // Calculate pricing based on tier
  const unitPrice = useMemo(() => {
    if (!currentVariant) return 0;
    if (selectedTier === "pallet" && currentVariant.palletPriceUsd) {
      return parseFloat(currentVariant.palletPriceUsd);
    }
    if (selectedTier === "case" && currentVariant.casePriceUsd) {
      return parseFloat(currentVariant.casePriceUsd);
    }
    return parseFloat(currentVariant.priceUsd);
  }, [currentVariant, selectedTier]);

  const totalPrice = Number((unitPrice * quantity).toFixed(2));

  const handleAddToCart = () => {
    if (!currentVariant) return;

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productImage: product.imageUrl,
      application: product.application,
      variantId: currentVariant.id,
      sku: currentVariant.sku,
      widthInches: currentVariant.widthInches,
      gauge: currentVariant.gauge,
      lengthFeet: currentVariant.lengthFeet,
      rollsPerBox: currentVariant.rollsPerBox,
      rollsPerPallet: currentVariant.rollsPerPallet,
      weightLbs: currentVariant.weightLbs,
      pricingTier: selectedTier,
      unitPrice,
      quantity,
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-200/40">
      {/* Header: Selected SKU & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs text-slate-400 font-medium">Selected Specification SKU:</span>
          <div className="font-mono text-base font-bold text-sky-700">
            {currentVariant?.sku}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-xs font-semibold">
            ● Ready to Ship
          </Badge>
        </div>
      </div>

      {/* 1. Width Selector */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          1. Select Roll Width (Inches)
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {widths.map((w) => {
            const isSelected = selectedWidth === w;
            return (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setSelectedWidth(w);
                  const matchingGauges = variants
                    .filter((v) => v.widthInches === w)
                    .map((v) => v.gauge);
                  if (!matchingGauges.includes(selectedGauge)) {
                    setSelectedGauge(matchingGauges[0]);
                  }
                }}
                className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                  isSelected
                    ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm ring-2 ring-sky-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {parseFloat(w)}" Width
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Gauge Selector */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            2. Select Film Gauge (Thickness)
          </label>
          <span className="text-[11px] text-slate-500 font-medium">
            {currentVariant ? formatGauge(currentVariant.gauge) : ""}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {availableGauges.map((g) => {
            const isSelected = selectedGauge === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGauge(g)}
                className={`py-3 px-3 rounded-2xl text-xs font-bold border transition-all text-center ${
                  isSelected
                    ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm ring-2 ring-sky-500/20"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {g} Gauge
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Packaging Tier (Roll vs Case vs Pallet) */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
          3. Choose Packaging Volume Tier
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Roll */}
          <button
            type="button"
            onClick={() => setSelectedTier("roll")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              selectedTier === "roll"
                ? "border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Single Roll</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-base font-extrabold text-slate-900">
              {formatCurrency(currentVariant?.priceUsd || 0)}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">1 roll sample</span>
          </button>

          {/* Case / Box */}
          <button
            type="button"
            onClick={() => setSelectedTier("case")}
            className={`p-4 rounded-2xl border text-left transition-all relative ${
              selectedTier === "case"
                ? "border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Full Case / Box</span>
              <Badge variant="default" className="text-[9px] px-1.5 py-0 font-bold">
                Popular
              </Badge>
            </div>
            <div className="mt-2 text-base font-extrabold text-sky-800">
              {formatCurrency(currentVariant?.casePriceUsd || currentVariant?.priceUsd || 0)}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {currentVariant?.rollsPerBox} rolls / case
            </span>
          </button>

          {/* Pallet Tier */}
          <button
            type="button"
            onClick={() => setSelectedTier("pallet")}
            className={`p-4 rounded-2xl border text-left transition-all relative ${
              selectedTier === "pallet"
                ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Full Pallet</span>
              <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold">
                Bulk Save
              </Badge>
            </div>
            <div className="mt-2 text-base font-extrabold text-emerald-700">
              {formatCurrency(currentVariant?.palletPriceUsd || 0)}
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {currentVariant?.rollsPerPallet} rolls / pallet
            </span>
          </button>
        </div>
      </div>

      {/* Technical Summary Bar */}
      {currentVariant && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-medium">Roll Length</span>
            <span className="font-bold text-slate-900">
              {currentVariant.lengthFeet.toLocaleString()} Feet
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-medium">Unit Weight</span>
            <span className="font-bold text-slate-900">
              {currentVariant.weightLbs} lbs
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-medium">Rolls/Pallet</span>
            <span className="font-bold text-slate-900">
              {currentVariant.rollsPerPallet} Rolls
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-medium">Film Type</span>
            <span className="font-bold text-slate-900">
              {product.filmType}
            </span>
          </div>
        </div>
      )}

      {/* Quantity and Add to Cart Action */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-bold uppercase">Qty:</span>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 bg-transparent text-center text-sm font-bold text-slate-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1 w-full flex items-center justify-between sm:justify-end gap-4">
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase block font-medium">Total Price</span>
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(totalPrice)}
            </span>
          </div>

          <Button
            onClick={handleAddToCart}
            variant="gradient"
            size="lg"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 font-bold shadow-lg shadow-sky-500/20"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Add to Cart & Quote</span>
          </Button>
        </div>
      </div>

      {addedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-semibold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          Added {quantity}x {currentVariant?.sku} to your commercial cart!
        </div>
      )}
    </div>
  );
}
