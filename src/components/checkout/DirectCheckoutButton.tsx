"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { openDirectCheckoutLink } from "@/lib/checkout-link";
import { BRAND_GRADIENT_CTA } from "@/lib/brand-styles";

interface DirectCheckoutButtonProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Return false to cancel navigation */
  onBeforeNavigate?: () => boolean | void;
}

export function DirectCheckoutButton({
  label = "Proceed to Direct Checkout",
  className = "",
  disabled = false,
  onBeforeNavigate,
}: DirectCheckoutButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    const shouldContinue = onBeforeNavigate?.();
    if (shouldContinue === false) return;
    openDirectCheckoutLink();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`${BRAND_GRADIENT_CTA} py-3 px-6 rounded-lg w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:opacity-50 ${className}`}
    >
      <span>{label}</span>
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </button>
  );
}
