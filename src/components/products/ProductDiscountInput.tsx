"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { applyDiscountCode } from "@/actions/discounts";
import type { AppliedDiscount } from "@/types/discount";
import {
  formatDiscountAppliedBadge,
} from "@/lib/discounts";
import { BRAND_GRADIENT_CTA } from "@/lib/brand-styles";

interface ProductDiscountInputProps {
  appliedDiscount: AppliedDiscount | null;
  onApplied: (discount: AppliedDiscount | null) => void;
}

export function ProductDiscountInput({
  appliedDiscount,
  onApplied,
}: ProductDiscountInputProps) {
  const [code, setCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Please enter a discount code.");
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      const result = await applyDiscountCode(trimmed);
      if (!result.success || !result.discount) {
        const message = result.error || "Invalid discount code.";
        setError(message);
        toast.error(message);
        return;
      }

      onApplied(result.discount);
      setCode("");
      toast.success(formatDiscountAppliedBadge(result.discount));
    } catch {
      setError("Unable to apply discount code.");
      toast.error("Unable to apply discount code.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleClear = () => {
    onApplied(null);
    setError(null);
    toast.message("Discount code removed");
  };

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        Have a discount code?
      </label>

      <form onSubmit={handleApply} className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter promo code"
            disabled={isApplying}
            className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold tracking-wide uppercase rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 disabled:opacity-60"
            aria-label="Enter promo code"
          />
        </div>
        <button
          type="submit"
          disabled={isApplying || !code.trim()}
          className={`${BRAND_GRADIENT_CTA} px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5`}
        >
          {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Apply
        </button>
      </form>

      {error && (
        <div className="text-[11px] font-semibold rounded-xl px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 animate-in fade-in duration-200">
          {error}
        </div>
      )}

      {appliedDiscount && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {formatDiscountAppliedBadge(appliedDiscount)}
              <span className="font-semibold text-emerald-700/80">
                {" "}
                · {appliedDiscount.code}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
            aria-label="Remove discount code"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
