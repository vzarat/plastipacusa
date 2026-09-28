"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/useCartStore";
import { BRAND_GRADIENT_CTA } from "@/lib/brand-styles";

interface DirectCheckoutButtonProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Customer email for Stripe Checkout + email-locked promos */
  customerEmail?: string;
  customerName?: string;
  companyName?: string;
  /** Return false to cancel navigation / session creation */
  onBeforeNavigate?: () => boolean | void;
}

/**
 * Primary checkout CTA — creates a Stripe Checkout Session via `/api/checkout`
 * and redirects the browser to `session.url`.
 */
export function DirectCheckoutButton({
  label = "Proceed to Checkout",
  className = "",
  disabled = false,
  customerEmail,
  customerName,
  companyName,
  onBeforeNavigate,
}: DirectCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const items = useCartStore((state) => state.items);
  const getDiscountAmount = useCartStore((state) => state.getDiscountAmount);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    const shouldContinue = onBeforeNavigate?.();
    if (shouldContinue === false) return;

    if (!items.length) {
      toast.error("Your cart is empty.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customerEmail: customerEmail || undefined,
          customerName: customerName || undefined,
          companyName: companyName || undefined,
          discountAmount: getDiscountAmount(),
          couponCode: appliedCoupon?.code || undefined,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        toast.error(data.error || "Unable to start Stripe Checkout.");
        return;
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[checkout] session redirect failed:", message);
      toast.error("Unable to start Stripe Checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={disabled || isLoading}
      className={`${BRAND_GRADIENT_CTA} py-3 px-6 rounded-lg w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          <span>Redirecting to Stripe…</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

export default DirectCheckoutButton;
