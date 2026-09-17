"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DirectCheckoutButton } from "@/components/checkout/DirectCheckoutButton";

export function CheckoutForm() {
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Direct checkout
        </p>
        <h2 className="text-lg font-black text-slate-900">
          Complete your order via our secure payment link
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          You will be redirected to Plastipac&apos;s direct checkout / quote desk to finalize
          payment and shipping details for your cart.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreedToPolicies}
          onChange={(e) => setAgreedToPolicies(e.target.checked)}
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

      <DirectCheckoutButton
        label="Complete Order via Direct Link"
        disabled={!agreedToPolicies}
        onBeforeNavigate={() => {
          if (!agreedToPolicies) {
            toast.error("Please agree to the Terms of Service and Refund Policy to continue.");
            return false;
          }
        }}
      />

      {!agreedToPolicies && (
        <p className="text-[11px] text-center text-slate-500">
          Agree to the policies above to enable direct checkout.
        </p>
      )}
    </div>
  );
}
