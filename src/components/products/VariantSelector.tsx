"use client";

import React, { useState, useMemo } from "react";
import { ProductWithVariants, ProductVariant } from "@/types";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingCart,
  CheckCircle2,
  Package,
  ShieldCheck,
  Truck,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VariantSelectorProps {
  product: ProductWithVariants;
}

export function VariantSelector({ product }: VariantSelectorProps) {
  const variants = product.variants;
  const addItem = useCartStore((state) => state.addItem);

  // Default to 1 BOX WITH 4 ROLLS
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    variants[0]?.id || 1
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState(false);

  const selectedVariant: ProductVariant = useMemo(() => {
    return (
      variants.find((v) => v.id === selectedVariantId) ||
      variants[0]
    );
  }, [variants, selectedVariantId]);

  const unitPrice = parseFloat(selectedVariant?.priceUsd || "20.71");
  const totalPrice = Number((unitPrice * quantity).toFixed(2));

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      productImage: product.imageUrl,
      packageSize: selectedVariant.packageSize || selectedVariant.sku,
      totalRolls: selectedVariant.rollsPerBox,
      totalBoxes: selectedVariant.rollsPerBox <= 4 ? 1 : Math.round(selectedVariant.rollsPerBox / 4),
      application: product.application,
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      widthInches: selectedVariant.widthInches,
      gauge: selectedVariant.gauge,
      lengthFeet: selectedVariant.lengthFeet,
      rollsPerBox: selectedVariant.rollsPerBox,
      rollsPerPallet: selectedVariant.rollsPerPallet,
      weightLbs: selectedVariant.weightLbs,
      pricingTier: selectedVariant.packageSize || "Package Size",
      unitPrice,
      quantity,
    });

    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2500);
  };

  const handlePayPalCheckout = () => {
    handleAddToCart();
    alert(`Connecting to PayPal Express Checkout for ${formatCurrency(totalPrice)} USD...`);
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 space-y-7 shadow-xl shadow-slate-200/40">
      {/* Dynamic Price Header */}
      <div className="pb-5 border-b border-slate-100 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold block mb-1">
            Official Factory Direct Price
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {formatCurrency(unitPrice)}
            </span>
            <span className="text-sm font-bold text-slate-500">USD</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-xs font-semibold px-3 py-1">
            ● In Stock
          </Badge>
        </div>
      </div>

      {/* Package Size Pill Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
            Package Options
          </label>
          <span className="text-xs font-semibold text-sky-700">
            {selectedVariant?.packageSize}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {variants.map((variant) => {
            const isSelected = selectedVariant?.id === variant.id;
            const price = parseFloat(variant.priceUsd);

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariantId(variant.id)}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-sky-600 bg-sky-600"
                        : "border-slate-300 group-hover:border-slate-400"
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span
                      className={`text-xs sm:text-sm font-bold block ${
                        isSelected ? "text-slate-900" : "text-slate-700"
                      }`}
                    >
                      {variant.packageSize || variant.sku}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      SKU: {variant.sku} • {variant.rollsPerBox} Rolls included • {variant.weightLbs} lbs
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-sm sm:text-base font-extrabold ${
                      isSelected ? "text-sky-800" : "text-slate-900"
                    }`}
                  >
                    {formatCurrency(price)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">USD</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Specifications Highlight Box */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
          Specifications
        </label>
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Width</span>
            <span className="font-bold text-slate-900">
              {selectedVariant?.widthInches ? `${Math.round(parseFloat(selectedVariant.widthInches))}" Inches` : '18" Inches'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Gauge</span>
            <span className="font-bold text-slate-900">
              {selectedVariant?.gauge ? `${selectedVariant.gauge} Gauge` : "50 Gauge"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Length</span>
            <span className="font-bold text-slate-900">
              {selectedVariant?.lengthFeet ? `${selectedVariant.lengthFeet.toLocaleString()} Feet` : "1,000 Feet"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Core Type</span>
            <span className="font-bold text-slate-900">Standard 3" Core</span>
          </div>
        </div>
      </div>

      {/* Quantity & Actions */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        {/* Quantity Increment/Decrement */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-bold uppercase">Quantity:</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 font-bold"
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
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 font-bold"
              >
                +
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase block font-semibold">Subtotal</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(totalPrice)} <span className="text-xs font-semibold text-slate-500">USD</span>
            </span>
          </div>
        </div>

        {/* Buttons: Add to Cart & PayPal Express */}
        <div className="space-y-2.5 pt-1">
          <Button
            type="button"
            onClick={handleAddToCart}
            variant="gradient"
            size="lg"
            className="w-full flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-sky-500/20 py-6 rounded-2xl"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Add to Cart</span>
          </Button>

          {/* Express PayPal Button Placeholder */}
          <button
            type="button"
            onClick={handlePayPalCheckout}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#FFC439] hover:bg-[#F4B924] transition-all text-slate-900 font-extrabold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <span className="italic font-black text-blue-900 text-base">Pay</span>
            <span className="italic font-black text-sky-600 text-base -ml-1">Pal</span>
            <span className="text-slate-800 text-xs font-bold ml-1">Express Checkout</span>
          </button>
        </div>
      </div>

      {addedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 font-semibold shadow-sm animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Added {quantity}x {selectedVariant?.packageSize} to your cart!</span>
        </div>
      )}
    </div>
  );
}
