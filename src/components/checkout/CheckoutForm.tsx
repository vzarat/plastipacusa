"use client";

import { PromoCodeInput } from "@/components/cart/PromoCodeInput";
import Link from "next/link";

interface CheckoutFormProps {
  agreedToPolicies: boolean;
  onAgreedToPoliciesChange: (agreed: boolean) => void;
  checkoutEmail: string;
  onCheckoutEmailChange: (email: string) => void;
}

export function CheckoutForm({
  agreedToPolicies,
  onAgreedToPoliciesChange,
  checkoutEmail,
  onCheckoutEmailChange,
}: CheckoutFormProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Secure checkout
        </p>
        <h2 className="text-lg font-black text-slate-900">
          Review details, then pay with Stripe
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Agree to the policies below, then use{" "}
          <span className="font-semibold text-slate-800">Proceed to Checkout</span>{" "}
          in the order summary to open Stripe&apos;s secure payment page.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <label className="space-y-1.5 block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Email (for email-locked promo codes)
          </span>
          <input
            type="email"
            value={checkoutEmail}
            onChange={(e) => onCheckoutEmailChange(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
          />
        </label>
        <PromoCodeInput userEmail={checkoutEmail || null} showBreakdown={false} />
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreedToPolicies}
          onChange={(e) => onAgreedToPoliciesChange(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
          aria-describedby="checkout-policy-consent"
        />
        <span id="checkout-policy-consent" className="text-xs leading-relaxed text-slate-600">
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

      {!agreedToPolicies && (
        <p className="text-[11px] text-center text-slate-500">
          Agree to the policies above to enable checkout.
        </p>
      )}
    </div>
  );
}
