"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { BRAND_GRADIENT_CTA } from "@/lib/brand-styles";
import { createClient } from "@/lib/supabase/client";
import { CheckoutAuthRequiredModal } from "@/components/checkout/CheckoutAuthRequiredModal";

interface DirectCheckoutButtonProps {
  label?: string;
  className?: string;
  disabled?: boolean;
  /** Return false to cancel navigation */
  onBeforeNavigate?: () => boolean | void;
  /** Runs after a signed-in shopper is sent to checkout. */
  onNavigate?: () => void;
}

/**
 * Navigates to embedded Stripe checkout only when a Supabase session exists.
 * Guests see an auth-required modal with Sign In / Register links.
 */
export function DirectCheckoutButton({
  label = "Proceed to Checkout",
  className = "",
  disabled = false,
  onBeforeNavigate,
  onNavigate,
}: DirectCheckoutButtonProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleClick = async () => {
    if (disabled || isChecking) return;

    const shouldContinue = onBeforeNavigate?.();
    if (shouldContinue === false) return;

    setIsChecking(true);
    try {
      if (!useCartStore.persist.hasHydrated()) {
        await useCartStore.persist.rehydrate();
      }
      const latestItems = useCartStore.getState().items;
      if (!latestItems.length) {
        router.push("/products");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setShowAuthModal(true);
        return;
      }

      router.push("/checkout");
      onNavigate?.();
    } catch {
      setShowAuthModal(true);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || isChecking}
        className={`${
          disabled
            ? "bg-slate-300 text-slate-500 shadow-none"
            : BRAND_GRADIENT_CTA
        } py-3 px-6 rounded-lg w-full flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed ${className || ""}`}
      >
        {isChecking ? (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            <span>Checking account…</span>
          </>
        ) : (
          <>
            <span>{label}</span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </>
        )}
      </button>

      <CheckoutAuthRequiredModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectTo="/checkout"
      />
    </>
  );
}

export default DirectCheckoutButton;
