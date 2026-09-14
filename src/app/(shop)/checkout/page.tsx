"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { createPaymentIntent } from "@/actions/checkout";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import { getStripe } from "@/lib/stripe";

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTotalWeight = useCartStore((state) => state.getTotalWeight);
  const clearCart = useCartStore((state) => state.clearCart);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPreparingCheckout, setIsPreparingCheckout] = useState(false);

  const subtotal = getSubtotal();
  const totalWeight = getTotalWeight();

  useEffect(() => {
    if (items.length === 0) {
      setClientSecret(null);
      return;
    }

    let active = true;

    const prepareCheckout = async () => {
      setIsPreparingCheckout(true);
      setCheckoutError(null);
      setClientSecret(null);

      try {
        const result = await createPaymentIntent(subtotal, "usd");

        if (!active) {
          return;
        }

        if (result.success && result.clientSecret) {
          setClientSecret(result.clientSecret);
          return;
        }

        setCheckoutError(
          result.error || "Unable to load checkout at this time. Please return to cart."
        );
        toast.error(result.error || "Unable to load checkout at this time.");
      } catch (error: any) {
        console.error("Checkout intent error", error);
        const fallbackMessage = "Unable to load checkout at this time. Please return to cart.";
        if (active) {
          setCheckoutError(fallbackMessage);
          toast.error(error?.message || fallbackMessage);
        }
      } finally {
        if (active) {
          setIsPreparingCheckout(false);
        }
      }
    };

    prepareCheckout();

    return () => {
      active = false;
    };
  }, [items.length, subtotal]);

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">Checkout</p>
          <h1 className="mt-4 text-3xl font-black text-slate-900">Your cart is empty</h1>
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

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">Checkout</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Secure payment</h1>
        </div>

        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/products">Back to catalog</Link>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {isPreparingCheckout ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-slate-500">
              Preparing Stripe checkout...
            </div>
          ) : clientSecret && !checkoutError ? (
            <Elements stripe={getStripe()} options={{ clientSecret }}>
              <CheckoutForm />
            </Elements>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 text-center text-sm text-red-600">
              <p className="max-w-md text-base font-semibold text-slate-800">
                Unable to load checkout at this time. Please return to cart.
              </p>
              <p className="max-w-md text-slate-600">
                {checkoutError || "The secure payment service is temporarily unavailable."}
              </p>
              <Button asChild variant="outline" className="mt-2">
                <Link href="/products">Return to products</Link>
              </Button>
            </div>
          )}
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Order summary</h2>

          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-900">{formatCurrency(item.totalPrice)}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Weight</span>
              <span className="font-semibold text-slate-800">{totalWeight} lbs</span>
            </div>
            <div className="flex items-center justify-between text-lg font-black text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-6 w-full"
            onClick={() => clearCart()}
          >
            Clear cart
          </Button>
        </aside>
      </div>
    </main>
  );
}
