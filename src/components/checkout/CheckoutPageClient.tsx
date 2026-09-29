"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, LogIn, UserPlus } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

export function CheckoutPageClient() {
  const { locale } = useLanguage();
  const isEs = locale === "es";

  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getDiscountAmount = useCartStore((state) => state.getDiscountAmount);
  const getDiscountedTotal = useCartStore((state) => state.getDiscountedTotal);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const getTotalWeight = useCartStore((state) => state.getTotalWeight);
  const clearCart = useCartStore((state) => state.clearCart);

  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      setAuthChecking(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user?.id) {
          setIsAuthenticated(true);
          if (user.email) {
            setCheckoutEmail((prev) => prev || user.email || "");
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };

    void verifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const total = getDiscountedTotal();
  const totalWeight = getTotalWeight();

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
            Checkout
          </p>
          <h1 className="mt-4 text-3xl font-black text-slate-900">
            Your cart is empty
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Add products to your cart before continuing to secure checkout.
          </p>
          <Button asChild variant="gradient" className="mt-8">
            <Link href="/products">Continue shopping</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (authChecking) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-4xl items-center justify-center px-6 py-16">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          {isEs ? "Verificando sesión…" : "Verifying session…"}
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent("/checkout");
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10">
                <Lock className="h-5 w-5 text-sky-100" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100/90">
                  {isEs ? "Cuenta B2B requerida" : "B2B account required"}
                </p>
                <h1 className="text-xl font-black">
                  {isEs ? "Inicia sesión para pagar" : "Sign in to checkout"}
                </h1>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-8 py-7">
            <p className="text-sm leading-relaxed text-slate-600">
              {isEs
                ? "Debes iniciar sesión o crear una cuenta B2B para completar tu pedido."
                : "You must sign in or create a B2B account to complete your order."}
            </p>
            <p className="text-xs text-slate-500">
              {isEs
                ? "You must sign in or create a B2B account to complete your order."
                : "Debes iniciar sesión o crear una cuenta B2B para completar tu pedido."}
            </p>
            <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
              <Link
                href={`/login?redirect=${redirect}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-md"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {isEs ? "Iniciar sesión" : "Sign In"}
              </Link>
              <Link
                href={`/register?redirect=${redirect}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                <UserPlus className="h-4 w-4" aria-hidden />
                {isEs ? "Crear cuenta" : "Register"}
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            Secure checkout
          </h1>
        </div>

        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/products">Back to catalog</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <CheckoutForm
            agreedToPolicies={agreedToPolicies}
            onAgreedToPoliciesChange={setAgreedToPolicies}
            checkoutEmail={checkoutEmail}
            onCheckoutEmailChange={setCheckoutEmail}
          />
        </div>

        <aside className="lg:col-span-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6 shadow-sm h-fit lg:sticky lg:top-6">
          <h2 className="text-lg font-black text-slate-900">Order summary</h2>

          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.productName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {formatCurrency(item.totalPrice)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Weight</span>
              <span className="font-semibold text-slate-800">
                {totalWeight} lbs
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {appliedCoupon && discountAmount > 0 && (
              <>
                <div className="flex items-center justify-between text-emerald-700 font-bold">
                  <span className="inline-flex items-center gap-1.5">
                    Discount
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                      {appliedCoupon.code}
                    </span>
                  </span>
                  <span>- {formatCurrency(discountAmount)} USD</span>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">
                  Total savings: {formatCurrency(discountAmount)} USD
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-lg font-black text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
            Payment is completed in the left column using Stripe&apos;s embedded
            Payment Element. You will return here after confirmation.
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-4"
            onClick={() => clearCart()}
          >
            Clear cart
          </Button>
        </aside>
      </div>
    </main>
  );
}
