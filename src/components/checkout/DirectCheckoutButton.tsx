"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { BRAND_GRADIENT_CTA } from "@/lib/brand-styles";

interface DirectCheckoutButtonProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Return false to cancel navigation */
  onBeforeNavigate?: () => boolean | void;
}

/**
 * Navigates to the embedded Stripe Elements checkout page (no hosted redirect).
 */
export function DirectCheckoutButton({
  label = "Proceed to Checkout",
  className = "",
  disabled = false,
  onBeforeNavigate,
}: DirectCheckoutButtonProps) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);

  const handleClick = () => {
    if (disabled) return;
    const shouldContinue = onBeforeNavigate?.();
    if (shouldContinue === false) return;

    if (!items.length) {
      router.push("/products");
      return;
    }

    router.push("/checkout");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`${BRAND_GRADIENT_CTA} py-3 px-6 rounded-lg w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50 ${className}`}
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  );
}

export default DirectCheckoutButton;
