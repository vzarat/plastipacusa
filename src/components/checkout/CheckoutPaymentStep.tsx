"use client";

import Link from "next/link";
import { MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import { StripeEmbeddedCheckout } from "@/components/checkout/StripeEmbeddedCheckout";
import { Button } from "@/components/ui/button";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { useCartStore } from "@/lib/store/useCartStore";
import { calculateOrderTotal } from "@/lib/sales-tax";
import { deliveryMethodLabel } from "@/lib/shipping-method";
import { formatCurrency } from "@/lib/utils";
import type { CheckoutShippingAddress } from "@/lib/shipping-address";

interface CheckoutPaymentStepProps {
  agreedToPolicies: boolean;
  onAgreedToPoliciesChange: (agreed: boolean) => void;
  checkoutEmail: string;
  onCheckoutEmailChange: (email: string) => void;
  shipping: CheckoutShippingAddress;
  shippingAmount: number;
  onBack: () => void;
  onEditAddress: () => void;
  onEditMethod: () => void;
}

export function CheckoutPaymentStep({
  agreedToPolicies,
  onAgreedToPoliciesChange,
  checkoutEmail,
  onCheckoutEmailChange,
  shipping,
  shippingAmount,
  onBack,
  onEditAddress,
  onEditMethod,
}: CheckoutPaymentStepProps) {
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.getSubtotal());
  const discountAmount = useCartStore((state) => state.getDiscountAmount());
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const { selectedAddress, deliveryMethod } = useCheckoutState();
  const quote = calculateOrderTotal({
    subtotal,
    discount: discountAmount,
    shipping: shippingAmount,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Step 4
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">Payment</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review the final total, then pay with the secure Stripe form.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Order summary
        </p>
        <ul className="mt-3 space-y-2 border-b border-slate-100 pb-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-slate-700">
                {item.quantity} × {item.productName}
              </span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(item.totalPrice)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <dt>Subtotal</dt>
            <dd className="font-semibold text-slate-900">
              {formatCurrency(quote.subtotal)}
            </dd>
          </div>
          {quote.discount > 0 && (
            <div className="flex items-center justify-between text-emerald-700">
              <dt>
                Discount
                {appliedCoupon?.code ? ` (${appliedCoupon.code})` : ""}
              </dt>
              <dd className="font-semibold">- {formatCurrency(quote.discount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between text-slate-600">
            <dt>Estimated shipping</dt>
            <dd className="font-semibold text-slate-900">
              {formatCurrency(quote.shipping)}
            </dd>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <dt>Estimated sales tax (8.25%)</dt>
            <dd className="font-semibold text-slate-900">
              {formatCurrency(quote.tax)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base font-black text-slate-900">
            <dt>Estimated total</dt>
            <dd>{formatCurrency(quote.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-sky-700" />
              Delivery address
            </p>
            <button
              type="button"
              onClick={onEditAddress}
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              Edit
            </button>
          </div>
          {selectedAddress ? (
            <div className="mt-2 text-sm text-slate-700">
              <p className="font-bold text-slate-900">{selectedAddress.fullName}</p>
              {selectedAddress.companyName && <p>{selectedAddress.companyName}</p>}
              <p>{selectedAddress.streetAddress}</p>
              <p>
                {selectedAddress.city}, {selectedAddress.state}{" "}
                {selectedAddress.postalCode}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No address selected.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <Truck className="h-3.5 w-3.5 text-sky-700" />
              Shipping method
            </p>
            <button
              type="button"
              onClick={onEditMethod}
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              Edit
            </button>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {deliveryMethodLabel(deliveryMethod)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {formatCurrency(quote.shipping)}
          </p>
        </div>
      </section>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Email for receipt
        </span>
        <input
          type="email"
          value={checkoutEmail}
          onChange={(event) => onCheckoutEmailChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <input
          type="checkbox"
          checked={agreedToPolicies}
          onChange={(event) => onAgreedToPoliciesChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-xs leading-relaxed text-slate-600">
          I agree to Plastipac USA&apos;s{" "}
          <Link
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-700 hover:underline"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/refund-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-700 hover:underline"
          >
            Refund Policy
          </Link>
          .
        </span>
      </label>

      <StripeEmbeddedCheckout
        customerEmail={checkoutEmail}
        shipping={shipping}
        shippingAmount={shippingAmount}
        agreedToPolicies={agreedToPolicies}
        onRequireAgreement={() => {
          toast.error(
            "Please agree to the Terms of Service and Refund Policy to continue."
          );
        }}
      />

      <Button type="button" variant="outline" onClick={onBack}>
        Back to Shipping Method
      </Button>
    </div>
  );
}
