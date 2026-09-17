"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { applyCouponCode } from "@/actions/coupons";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import { BRAND_GRADIENT_CTA } from "@/lib/brand-styles";

interface PromoCodeInputProps {
  userEmail?: string | null;
  compact?: boolean;
  /** Show subtotal / discount / total under the applied badge. Default: !compact */
  showBreakdown?: boolean;
}

export function PromoCodeInput({
  userEmail,
  compact = false,
  showBreakdown,
}: PromoCodeInputProps) {
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);
  const clearCoupon = useCartStore((s) => s.clearCoupon);
  const getDiscountAmount = useCartStore((s) => s.getDiscountAmount);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getDiscountedTotal = useCartStore((s) => s.getDiscountedTotal);

  const [code, setCode] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const includeBreakdown = showBreakdown ?? !compact;
  const discountAmount = getDiscountAmount();
  const subtotal = getSubtotal();
  const total = getDiscountedTotal();

  const handleApply = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setFeedback({ type: "error", message: "Please enter a promo code." });
      return;
    }

    setIsApplying(true);
    setFeedback(null);

    try {
      const result = await applyCouponCode(trimmed, userEmail);
      if (!result.success || !result.coupon) {
        const message = result.error || "Invalid promo code.";
        setFeedback({ type: "error", message });
        toast.error(message);
        return;
      }

      setAppliedCoupon(result.coupon);
      setCode("");
      setFeedback({
        type: "success",
        message: `Code ${result.coupon.code} applied · ${result.coupon.discountPercent}% off eligible items`,
      });
      toast.success(`Promo ${result.coupon.code} applied`);
    } catch {
      setFeedback({ type: "error", message: "Unable to apply promo code." });
      toast.error("Unable to apply promo code.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleClear = () => {
    clearCoupon();
    setFeedback(null);
    toast.message("Promo code removed");
  };

  return (
    <div className={`space-y-3 ${compact ? "" : "pt-1"}`}>
      <form onSubmit={handleApply} className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Promo code"
            disabled={isApplying}
            className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold tracking-wide uppercase rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 disabled:opacity-60"
            aria-label="Promo code"
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

      {feedback && (
        <div
          className={`text-[11px] font-semibold rounded-xl px-3 py-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {appliedCoupon && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{appliedCoupon.code}</span>
              <span className="font-semibold text-emerald-700">
                · {appliedCoupon.discountPercent}% OFF
              </span>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
              aria-label="Remove promo code"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {includeBreakdown && (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount ({appliedCoupon.code})</span>
                <span>- {formatCurrency(discountAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-black pt-1 border-t border-emerald-200/80">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
