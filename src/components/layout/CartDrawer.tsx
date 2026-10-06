"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DirectCheckoutButton } from "@/components/checkout/DirectCheckoutButton";
import { CheckoutAuthRequiredModal } from "@/components/checkout/CheckoutAuthRequiredModal";
import { PromoCodeInput } from "@/components/cart/PromoCodeInput";
import { ShippingEligibilityAlert } from "@/components/checkout/ShippingEligibilityAlert";
import {
  readCheckoutShipping,
  type CheckoutShippingAddress,
} from "@/lib/shipping-address";
import { countCartBoxes } from "@/lib/shipping-method";
import { evalShippingEligibility } from "@/lib/shippingRules";
import { canIncreaseCartQuantity, cartQuantityNote } from "@/lib/cart-quantity";
import { calculateOrderTotal } from "@/lib/sales-tax";
import { createClient } from "@/lib/supabase/client";

export function CartDrawer() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    items,
    isDrawerOpen,
    closeDrawer,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getDiscountAmount,
    appliedCoupon,
    getTotalWeight,
  } = useCartStore();

  const [savedShipping, setSavedShipping] = useState<CheckoutShippingAddress | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [awaitingCheckout, setAwaitingCheckout] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) return;
    setSavedShipping(readCheckoutShipping());
  }, [isDrawerOpen, items]);

  const cartBoxes = useMemo(() => countCartBoxes(items), [items]);
  const drawerEligibility = useMemo(() => {
    if (!savedShipping?.postalCode && !savedShipping?.city) return null;
    return evalShippingEligibility(
      savedShipping.postalCode,
      savedShipping.city,
      savedShipping.state,
      cartBoxes
    );
  }, [savedShipping, cartBoxes]);

  const goToCheckoutIfAuthenticated = async () => {
    if (isOpeningCheckout) return;
    setIsOpeningCheckout(true);
    try {
      if (!useCartStore.persist.hasHydrated()) {
        await useCartStore.persist.rehydrate();
      }
      const latestItems = useCartStore.getState().items;
      if (!latestItems.length) {
        setIsOpeningCheckout(false);
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        setShowAuthModal(true);
        setIsOpeningCheckout(false);
        return;
      }

      router.push("/checkout");
      if (pathname === "/checkout") {
        setIsOpeningCheckout(false);
        closeDrawer();
      } else {
        setAwaitingCheckout(true);
      }
    } catch {
      setShowAuthModal(true);
      setIsOpeningCheckout(false);
    }
  };

  useEffect(() => {
    if (isDrawerOpen) return;
    setIsOpeningCheckout(false);
    setAwaitingCheckout(false);
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!awaitingCheckout) return;
    if (pathname === "/checkout" || pathname.startsWith("/checkout/")) {
      setAwaitingCheckout(false);
      setIsOpeningCheckout(false);
      closeDrawer();
    }
  }, [awaitingCheckout, pathname, closeDrawer]);

  useEffect(() => {
    if (!isDrawerOpen || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const quote = calculateOrderTotal({
    subtotal,
    discount: discountAmount,
    shipping: 0,
  });
  const discountedTotal = quote.total;
  const totalWeight = getTotalWeight();

  return (
    <div
      className={`fixed inset-0 z-[80] ${
        isDrawerOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!isDrawerOpen}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out ${
          isDrawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeDrawer}
      />

      {/* Right slide-over panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-md bg-white border-l border-slate-200 text-slate-900 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Your Cart</h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  asChild
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
                      {formatRollDimensions(
                        item?.widthInches,
                        item?.gauge,
                        item?.lengthFeet
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Badge variant="default" className="text-[10px] font-bold">
                    {item.packageSize || item.pricingTier}
                  </Badge>
                  <span className="text-slate-500 text-[11px]">
                    {item.application === "machine" && item.totalRolls
                      ? `${item.totalRolls} rolls`
                      : item.totalRolls
                        ? `${item.totalRolls} rolls / unit`
                        : `${item.rollsPerBox} rolls`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-slate-900 w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={!canIncreaseCartQuantity(item, item.quantity)}
                      className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
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
                {cartQuantityNote(item, item.quantity) && (
                  <p className="text-[10px] font-medium text-amber-800">
                    {cartQuantityNote(item, item.quantity)}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Summary & Actions */}
        {items.length > 0 && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/60 space-y-4 shrink-0">
            <PromoCodeInput compact />

            {drawerEligibility && (
              <ShippingEligibilityAlert eligibility={drawerEligibility} />
            )}

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <Weight className="w-3.5 h-3.5 text-slate-400" /> Total Weight
                </span>
                <span className="font-bold text-slate-800">{totalWeight} lbs</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800">
                <span>Subtotal</span>
                <span className="text-base font-black text-slate-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              {appliedCoupon && discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-emerald-700 font-bold animate-in fade-in duration-200">
                    <span className="inline-flex items-center gap-1.5">
                      Discount
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                        {appliedCoupon.code}
                      </span>
                    </span>
                    <span>- {formatCurrency(discountAmount)} USD</span>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] font-bold text-emerald-800">
                    Total savings: {formatCurrency(discountAmount)} USD
                  </div>
                </>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Estimated Tax ({(quote.taxRate * 100).toFixed(2)}%)</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(quote.tax)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 pt-1 border-t border-slate-200/80">
                <span>Total</span>
                <span className="text-xl font-black text-slate-900">
                  {formatCurrency(quote.total)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Shipping calculated at checkout
              </p>
            </div>

            <div className="space-y-2" data-tour="cart-quick-actions">
              <DirectCheckoutButton
                key={isDrawerOpen ? "checkout-open" : "checkout-closed"}
                label="Proceed to Checkout"
                onNavigate={() => {
                  if (pathname === "/checkout") {
                    closeDrawer();
                  } else {
                    setAwaitingCheckout(true);
                  }
                }}
              />
              <Button
                onClick={() => void goToCheckoutIfAuthenticated()}
                variant="outline"
                disabled={isOpeningCheckout}
                className="w-full text-xs font-semibold border-slate-200 hover:bg-slate-100"
              >
                {isOpeningCheckout ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : null}
                Review Order ({formatCurrency(discountedTotal)})
              </Button>
              <button
                type="button"
                onClick={clearCart}
                className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 transition-colors pt-1 cursor-pointer"
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </aside>

      <CheckoutAuthRequiredModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectTo="/checkout"
      />
    </div>
  );
}

export default CartDrawer;
