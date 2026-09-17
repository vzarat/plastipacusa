"use client";

import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { DirectCheckoutButton } from "@/components/checkout/DirectCheckoutButton";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";

export function CheckoutPageClient() {
  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getTotalWeight = useCartStore((state) => state.getTotalWeight);
  const clearCart = useCartStore((state) => state.clearCart);

  const subtotal = getSubtotal();
  const totalWeight = getTotalWeight();

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
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">Checkout</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Direct checkout</h1>
        </div>

        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/products">Back to catalog</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          <CheckoutForm />
        </div>

        <aside className="lg:col-span-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Order summary</h2>

          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
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
              <span className="font-semibold text-slate-800">{totalWeight} lbs</span>
            </div>
            <div className="flex items-center justify-between text-lg font-black text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <DirectCheckoutButton label="Proceed to Direct Checkout" />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => clearCart()}
            >
              Clear cart
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}
