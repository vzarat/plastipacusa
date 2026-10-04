"use client";

import React from "react";
import Link from "next/link";
import { CreditCard, Building2, Truck } from "lucide-react";
import { toast } from "sonner";
import { PromoCodeInput } from "@/components/cart/PromoCodeInput";
import { StripeEmbeddedCheckout } from "@/components/checkout/StripeEmbeddedCheckout";
import type { CheckoutShippingAddress } from "@/lib/shipping-address";

interface CheckoutFormProps {
  agreedToPolicies: boolean;
  onAgreedToPoliciesChange: (agreed: boolean) => void;
  checkoutEmail: string;
  onCheckoutEmailChange: (email: string) => void;
  shipping: CheckoutShippingAddress;
  onShippingChange: (shipping: CheckoutShippingAddress) => void;
  shippingAmount?: number;
}

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 md:h-auto md:py-2.5";

function ShippingField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

export function CheckoutForm({
  agreedToPolicies,
  onAgreedToPoliciesChange,
  checkoutEmail,
  onCheckoutEmailChange,
  shipping,
  onShippingChange,
  shippingAmount = 0,
}: CheckoutFormProps) {
  const setShip = (key: keyof CheckoutShippingAddress, value: string) => {
    onShippingChange({ ...shipping, [key]: value });
  };
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Secure checkout
        </p>
        <h2 className="text-lg font-black text-slate-900">
          Pay on-site with Stripe Elements
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Enter your email, agree to the policies, and complete payment with the
          embedded Stripe form — no redirect to hosted Checkout.
        </p>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        data-tour="checkout-payment-options"
      >
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-sky-800">
            <CreditCard className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Credit Card
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pay instantly with Visa, Mastercard, Amex, or Discover via Stripe.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-800">
            <Building2 className="w-4 h-4 text-sky-700" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Net 30 Commercial Credit
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Approved B2B accounts can invoice on Net 30 terms.{" "}
            <Link
              href="/credit-application"
              className="font-semibold text-sky-700 hover:underline"
            >
              Apply for credit →
            </Link>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <label className="space-y-1.5 block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Email (receipt + promo codes)
          </span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={checkoutEmail}
            onChange={(e) => onCheckoutEmailChange(e.target.value)}
            placeholder="you@company.com"
            required
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 md:h-auto md:py-2.5"
          />
        </label>
        <PromoCodeInput userEmail={checkoutEmail || null} showBreakdown={false} />
      </div>

      <section
        id="checkout-shipping"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-start gap-2">
          <Truck className="mt-0.5 h-4 w-4 text-sky-700" />
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Shipping Address
            </h3>
            <p className="text-xs text-slate-500">
              Required before payment. Used for delivery and order confirmation.
            </p>
          </div>
        </div>

        <ShippingField label="Full Name / Recibe" required>
          <input
            className={fieldClass}
            value={shipping.fullName}
            onChange={(e) => setShip("fullName", e.target.value)}
            autoComplete="name"
            inputMode="text"
            required
          />
        </ShippingField>
        <ShippingField label="Street Address" required>
          <input
            className={fieldClass}
            value={shipping.line1}
            onChange={(e) => setShip("line1", e.target.value)}
            autoComplete="address-line1"
            inputMode="text"
            required
          />
        </ShippingField>
        <ShippingField label="Apartment / Suite / Unit">
          <input
            className={fieldClass}
            value={shipping.line2}
            onChange={(e) => setShip("line2", e.target.value)}
            autoComplete="address-line2"
            inputMode="text"
          />
        </ShippingField>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ShippingField label="City" required>
            <input
              className={fieldClass}
              value={shipping.city}
              onChange={(e) => setShip("city", e.target.value)}
              autoComplete="address-level2"
              inputMode="text"
              required
            />
          </ShippingField>
          <ShippingField label="State / Region" required>
            <input
              className={fieldClass}
              value={shipping.state}
              onChange={(e) => setShip("state", e.target.value)}
              autoComplete="address-level1"
              inputMode="text"
              required
            />
          </ShippingField>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ShippingField label="Postal Code" required>
            <input
              className={fieldClass}
              value={shipping.postalCode}
              onChange={(e) => setShip("postalCode", e.target.value)}
              autoComplete="postal-code"
              inputMode="numeric"
              required
            />
          </ShippingField>
          <ShippingField label="Phone Number" required>
            <input
              type="tel"
              inputMode="tel"
              className={fieldClass}
              value={shipping.phone}
              onChange={(e) => setShip("phone", e.target.value)}
              autoComplete="tel"
              required
            />
          </ShippingField>
        </div>
      </section>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreedToPolicies}
          onChange={(e) => onAgreedToPoliciesChange(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
          aria-describedby="checkout-policy-consent"
        />
        <span
          id="checkout-policy-consent"
          className="text-xs leading-relaxed text-slate-600"
        >
          I agree to Plastipac USA&apos;s{" "}
          <Link
            href="/terms-of-service"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/refund-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}
