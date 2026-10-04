"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PromoCodeInput } from "@/components/cart/PromoCodeInput";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/types";

function specBadges(item: CartItem): string[] {
  const badges: string[] = [];
  const width = Number(item.widthInches);
  if (Number.isFinite(width) && width > 0) {
    badges.push(`${Number.isInteger(width) ? width : width} IN`);
  }
  if (item.gauge) badges.push(`${item.gauge} GA`);
  if (item.lengthFeet) {
    badges.push(`${Number(item.lengthFeet).toLocaleString("en-US")} FT`);
  }
  return badges;
}

interface CheckoutCartStepProps {
  checkoutEmail: string;
  onProceed: () => void;
}

export function CheckoutCartStep({
  checkoutEmail,
  onProceed,
}: CheckoutCartStepProps) {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const proceed = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty. Add a product before continuing.");
      return;
    }
    onProceed();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Step 1
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">Shopping Cart</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review quantities, specifications, and any discount before shipping.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700">Your cart is empty.</p>
          <p className="mt-1 text-xs text-slate-500">
            Add a product before continuing to the shipping address.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const badges = specBadges(item);
            return (
              <li
                key={item.id}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      fill
                      sizes="80px"
                      className="object-contain p-1"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">
                        {item.productName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatCurrency(item.unitPrice)} each
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 md:h-auto md:w-auto md:p-1.5"
                      aria-label={`Remove ${item.productName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {badges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-lg text-slate-600 hover:bg-white md:h-7 md:w-7"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-black text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-12 w-12 items-center justify-center rounded-lg text-slate-600 hover:bg-white md:h-7 md:w-7"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Discount code
        </p>
        <PromoCodeInput userEmail={checkoutEmail || null} showBreakdown={false} />
      </div>

      <Button
        type="button"
        variant="gradient"
        className="hidden h-12 w-full md:inline-flex md:h-10"
        onClick={proceed}
        disabled={items.length === 0}
      >
        Proceed to Shipping Address
      </Button>
    </div>
  );
}
