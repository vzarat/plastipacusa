"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency, formatRollDimensions } from "@/lib/utils";
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Package,
  Weight,
  Send,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitInquiry } from "@/actions/inquiries";

export function CartDrawer() {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotalWeight,
  } = useCartStore();

  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  if (!isDrawerOpen) return null;

  const subtotal = getSubtotal();
  const totalWeight = getTotalWeight();

  const handleQuickQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingQuote(true);

    const itemsSummary = items
      .map(
        (it) =>
          `${it.quantity}x ${it.productName} (${it.sku}) [${it.widthInches}" x ${it.gauge}Ga x ${it.lengthFeet}ft - Tier: ${it.pricingTier}]`
      )
      .join("\n");

    const result = await submitInquiry({
      companyName: company || "Direct Cart Quote Request",
      contactName: "Cart Purchaser",
      email: email,
      phone: phone || "N/A",
      monthlyPalletVolume: "Cart Quote",
      productInterest: "Commercial Cart Quote",
      message: `Items requested:\n${itemsSummary}\nEstimated Subtotal: $${subtotal}\nTotal Weight: ${totalWeight} lbs`,
    });

    setIsSubmittingQuote(false);
    if (result.success) {
      setQuoteSuccess(true);
      setTimeout(() => {
        setQuoteSuccess(false);
        setShowQuoteForm(false);
        closeDrawer();
      }, 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 text-slate-900 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Your Order & Quote</h2>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-3xl flex items-center justify-center mx-auto">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Explore our high-performance hand and machine stretch films to configure rolls, cases, or bulk pallets.
                </p>
                <Button
                  onClick={closeDrawer}
                  variant="gradient"
                  className="mt-4 text-xs font-bold shadow-md shadow-sky-500/20"
                >
                  <Link href="/products">Browse Product Catalog</Link>
                </Button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 font-bold">
                        {item.sku}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1.5">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {formatRollDimensions(item.widthInches, item.gauge, item.lengthFeet)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Packaging tier badge */}
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                      Tier: {item.pricingTier}
                    </Badge>
                    <span className="text-slate-500 text-[11px]">
                      {item.pricingTier === "pallet"
                        ? `${item.rollsPerPallet} rolls / pallet`
                        : item.pricingTier === "case"
                        ? `${item.rollsPerBox} rolls / case`
                        : "Single Roll"}
                    </span>
                  </div>

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-900 w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">
                        {formatCurrency(item.unitPrice)} each
                      </div>
                      <div className="text-base font-extrabold text-slate-900">
                        {formatCurrency(item.totalPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Actions */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/60 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Weight className="w-3.5 h-3.5 text-slate-400" /> Total Weight
                  </span>
                  <span className="font-bold text-slate-800">{totalWeight} lbs</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-800">
                  <span>Subtotal</span>
                  <span className="text-xl font-black text-slate-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  * Final freight costs and tier discounts verified upon quote review.
                </p>
              </div>

              {/* Quote Form or Actions */}
              {showQuoteForm ? (
                <form onSubmit={handleQuickQuote} className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-sky-700">
                    Instant Commercial Quote Request:
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Company Name"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Work Email (for official quote PDF)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {quoteSuccess ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-semibold">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Quote request dispatched to Plastipac desk!
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={isSubmittingQuote}
                        variant="gradient"
                        className="flex-1 text-xs font-bold shadow-sm"
                      >
                        {isSubmittingQuote ? "Submitting..." : "Send Request"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowQuoteForm(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </form>
              ) : (
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowQuoteForm(true)}
                    variant="gradient"
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold shadow-md shadow-sky-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Request Official B2B Quote
                  </Button>
                  <Button
                    onClick={() => {
                      alert("Connecting to Plastipac Secure Commercial Checkout...");
                    }}
                    variant="outline"
                    className="w-full text-xs font-semibold border-slate-200 hover:bg-slate-100"
                  >
                    Direct Checkout ({formatCurrency(subtotal)})
                  </Button>
                  <button
                    onClick={clearCart}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 transition-colors pt-1"
                  >
                    Clear Cart
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
