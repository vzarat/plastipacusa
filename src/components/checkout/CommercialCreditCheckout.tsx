"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { placeCommercialCreditOrder } from "@/actions/checkout";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import {
  isBrowserTurnstileEnabled,
  TurnstileField,
} from "@/components/security/TurnstileField";
import { BRAND_GRADIENT_CTA } from "@/lib/brand-styles";
import { quotePackageWeightLbs } from "@/lib/package-weight";
import {
  persistCheckoutShipping,
  validateCheckoutShipping,
  type CheckoutShippingAddress,
} from "@/lib/shipping-address";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";

export interface CommercialCreditAccount {
  approved: boolean;
  availableCredit: number;
  creditLimit: number;
  paymentTerms: string;
}

interface CommercialCreditCheckoutProps {
  account: CommercialCreditAccount;
  customerEmail: string;
  shipping: CheckoutShippingAddress;
  agreedToPolicies: boolean;
  onRequireAgreement: () => void;
  orderTotal: number;
  onServerTotal?: (total: number) => void;
}

export function CommercialCreditCheckout({
  account,
  customerEmail,
  shipping,
  agreedToPolicies,
  onRequireAgreement,
  orderTotal,
  onServerTotal,
}: CommercialCreditCheckoutProps) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const { selectedAddress, selectedShippingOption, taxExemptRequested } =
    useCheckoutState();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const turnstileRequired = isBrowserTurnstileEnabled();

  const canCover = account.approved && orderTotal <= account.availableCredit;
  const itemsSummary = useMemo(
    () =>
      items
        .map((item) => `${item.quantity}× ${item.productName}`)
        .join("; ")
        .slice(0, 450),
    [items]
  );

  const handleSubmit = async () => {
    if (!agreedToPolicies) {
      onRequireAgreement();
      return;
    }
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error("Enter a valid work email before placing a credit order.");
      return;
    }
    const shippingError = validateCheckoutShipping(shipping);
    if (shippingError) {
      toast.error(shippingError);
      return;
    }
    if (!canCover) {
      toast.error("This order exceeds your available commercial credit.");
      return;
    }
    if (turnstileRequired && !turnstileToken) {
      toast.error("Complete the bot check before submitting.");
      return;
    }

    setSubmitting(true);
    persistCheckoutShipping(shipping);
    try {
      const result = await placeCommercialCreditOrder({
        customerEmail,
        customerName: shipping.fullName,
        companyName: selectedAddress?.companyName || shipping.line2,
        itemsSummary,
        productSlugs: items.map((item) => item.productSlug).filter(Boolean),
        turnstileToken: turnstileToken || undefined,
        couponCode: appliedCoupon?.code,
        shippingQuoteId: selectedShippingOption?.id,
        fridayDeliveryDate: selectedShippingOption?.deliveryDate || undefined,
        shippingMethod: selectedShippingOption?.serviceName,
        shippingAddressId: selectedAddress?.id,
        taxExemptRequested,
        lineItems: items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          packageSize: item.packageSize,
          pricingTier: item.pricingTier,
          rollsPerBox: item.rollsPerBox,
          totalBoxes: item.totalBoxes,
          application: item.application,
          tierType: item.tierType,
          productSlug: item.productSlug,
        })),
        quoteLines: items.map((item) => ({
          sku: item.sku,
          productSlug: item.productSlug,
          quantity: item.quantity,
          totalBoxes: item.totalBoxes,
          totalRolls: item.totalRolls,
          application: item.application,
          weightLbs:
            quotePackageWeightLbs({
              application: item.application,
              boxes: item.totalBoxes,
              rolls: item.totalRolls,
              weightLbs: item.weightLbs,
              widthInches: item.widthInches,
              gauge: item.gauge,
              lengthFeet: item.lengthFeet,
            }) ?? 0,
        })),
        shipping,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to place commercial credit order.");
        return;
      }

      if (typeof result.total === "number") {
        onServerTotal?.(result.total);
      }

      clearCart();
      toast.success(
        result.orderId
          ? `Credit order ${result.orderId} placed — unpaid Net 30 invoice created.`
          : "Credit order placed — unpaid Net 30 invoice created."
      );
      router.push(
        `/checkout/success?credit=1&order_id=${encodeURIComponent(result.orderId || "")}`
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unable to place credit order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50/50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900">Commercial Credit / Terms</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            Charge this order to your approved {account.paymentTerms || "Net 30"} line. An unpaid
            B2B invoice is created and available credit is reduced immediately.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <div className="rounded-xl border border-white bg-white/80 p-3">
          <dt className="font-bold uppercase tracking-wider text-slate-500">Credit limit</dt>
          <dd className="mt-1 text-sm font-black text-slate-900">
            {formatCurrency(account.creditLimit)}
          </dd>
        </div>
        <div className="rounded-xl border border-white bg-white/80 p-3">
          <dt className="font-bold uppercase tracking-wider text-slate-500">Available</dt>
          <dd className="mt-1 text-sm font-black text-emerald-800">
            {formatCurrency(account.availableCredit)}
          </dd>
        </div>
        <div className="rounded-xl border border-white bg-white/80 p-3 col-span-2 sm:col-span-1">
          <dt className="font-bold uppercase tracking-wider text-slate-500">This order</dt>
          <dd className="mt-1 text-sm font-black text-slate-900">
            {formatCurrency(orderTotal)}
          </dd>
        </div>
      </dl>

      {!canCover ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          Order total exceeds available credit. Reduce the cart or pay by card.
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5" />
          Within available credit · due under {account.paymentTerms || "Net 30"}
        </p>
      )}

      {turnstileRequired ? <TurnstileField onToken={setTurnstileToken} /> : null}

      <button
        type="button"
        disabled={submitting || !canCover || !agreedToPolicies}
        onClick={() => void handleSubmit()}
        className={`${BRAND_GRADIENT_CTA} flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Placing credit order…
          </>
        ) : (
          <>Place order on {account.paymentTerms || "Net 30"} · {formatCurrency(orderTotal)}</>
        )}
      </button>
    </div>
  );
}
