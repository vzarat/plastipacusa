"use client";

import Link from "next/link";
import { MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import { StripeEmbeddedCheckout } from "@/components/checkout/StripeEmbeddedCheckout";
import { Button } from "@/components/ui/button";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { useCartStore } from "@/lib/store/useCartStore";
import { countCartBoxes } from "@/lib/shipping-method";
import { labelForShippingMethod } from "@/lib/shippingRules";
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
  const { selectedAddress, deliveryMethod } = useCheckoutState();
  const boxCount = countCartBoxes(items);
  const shippingLabel = labelForShippingMethod(
    deliveryMethod,
    selectedAddress?.postalCode || shipping.postalCode,
    selectedAddress?.city || shipping.city,
    selectedAddress?.state || shipping.state,
    boxCount
  );
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

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
            {shippingLabel}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {shippingAmount > 0 ? formatCurrency(shippingAmount) : "FREE"}
          </p>
        </div>
      </section>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Email for receipt
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={checkoutEmail}
          onChange={(event) => onCheckoutEmailChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 md:h-auto md:py-2.5"
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

      <Button type="button" variant="outline" className="h-12 md:h-10" onClick={onBack}>
        Back to Shipping Method
      </Button>
    </div>
  );
}
