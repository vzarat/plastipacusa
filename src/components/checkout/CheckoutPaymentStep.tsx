"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, CreditCard, MapPin, Truck } from "lucide-react";
import { toast } from "sonner";
import {
  CommercialCreditCheckout,
  type CommercialCreditAccount,
} from "@/components/checkout/CommercialCreditCheckout";
import { StripeEmbeddedCheckout } from "@/components/checkout/StripeEmbeddedCheckout";
import { Button } from "@/components/ui/button";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { useCartStore } from "@/lib/store/useCartStore";
import { estimatedShipmentWindow } from "@/lib/shipping/dates";
import { countCartBoxes } from "@/lib/shipping-method";
import { labelForShippingMethod } from "@/lib/shippingRules";
import { formatCurrency } from "@/lib/utils";
import {
  formatFridayDeliveryDate,
  fridayTransitLabel,
  resolveFridayDeliveryIso,
} from "@/lib/shipping/friday-delivery";
import type { CheckoutShippingAddress } from "@/lib/shipping-address";

interface CheckoutPaymentStepProps {
  agreedToPolicies: boolean;
  onAgreedToPoliciesChange: (agreed: boolean) => void;
  checkoutEmail: string;
  onCheckoutEmailChange: (email: string) => void;
  shipping: CheckoutShippingAddress;
  shippingAmount: number;
  orderTotal: number;
  creditAccount?: CommercialCreditAccount | null;
  onBack: () => void;
  onEditAddress: () => void;
  onEditMethod: () => void;
  onServerTotal?: (total: number) => void;
}

export function CheckoutPaymentStep({
  agreedToPolicies,
  onAgreedToPoliciesChange,
  checkoutEmail,
  onCheckoutEmailChange,
  shipping,
  shippingAmount,
  orderTotal,
  creditAccount = null,
  onBack,
  onEditAddress,
  onEditMethod,
  onServerTotal,
}: CheckoutPaymentStepProps) {
  const items = useCartStore((state) => state.items);
  const { selectedAddress, deliveryMethod, selectedShippingOption } = useCheckoutState();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "credit">("card");

  const creditEnabled =
    Boolean(creditAccount?.approved) &&
    orderTotal > 0 &&
    orderTotal <= Number(creditAccount?.availableCredit || 0);

  const boxCount = countCartBoxes(items);
  const cartRolls = items.reduce((total, item) => total + (Number(item.totalRolls) || 0), 0);
  const shippingLabel =
    selectedShippingOption?.serviceName ||
    labelForShippingMethod(
      deliveryMethod,
      selectedAddress?.postalCode || shipping.postalCode,
      selectedAddress?.city || shipping.city,
      selectedAddress?.state || shipping.state,
      boxCount,
      cartRolls
    );
  const fridayIso =
    selectedShippingOption?.id === "rgv-local" || selectedShippingOption?.id === "houston-friday"
      ? resolveFridayDeliveryIso(selectedShippingOption.deliveryDate)
      : null;
  const fridayDelivery = fridayIso ? formatFridayDeliveryDate(fridayIso) : null;
  const shipmentEstimate =
    !fridayIso && selectedShippingOption
      ? estimatedShipmentWindow(selectedShippingOption.transitDays)
      : null;

  const creditDisabledReason = useMemo(() => {
    if (!creditAccount?.approved) {
      return "Approved commercial credit required.";
    }
    if (orderTotal > Number(creditAccount.availableCredit || 0)) {
      return "Order total exceeds available credit.";
    }
    return null;
  }, [creditAccount, orderTotal]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Step 4
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">Payment</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose card payment or commercial credit terms (approved accounts only).
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
          {fridayDelivery && fridayIso ? (
            <p className="mt-1 text-sm font-semibold text-emerald-800">
              Estimated delivery: {fridayDelivery}
              <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-slate-600">
                {fridayTransitLabel(fridayIso)}. Ready for that route 3 business days after purchase.
              </span>
            </p>
          ) : shipmentEstimate ? (
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {shipmentEstimate.summary}
              <span className="mt-0.5 block text-xs font-semibold leading-relaxed text-slate-600">
                {shipmentEstimate.detail}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
              Estimated delivery is calculated once a shipping method is selected. Pickup is 3 business days after purchase.
            </p>
          )}
          <p className="mt-1 text-sm text-slate-600">
            {shippingAmount > 0 ? formatCurrency(shippingAmount) : "FREE"}
          </p>
        </div>
      </section>

      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        data-tour="checkout-payment-options"
      >
        <button
          type="button"
          onClick={() => setPaymentMethod("card")}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            paymentMethod === "card"
              ? "border-sky-300 bg-sky-50/80 ring-2 ring-sky-100"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-2 text-sky-800">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Credit Card</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Pay instantly with Visa, Mastercard, Amex, or Discover via Stripe.
          </p>
        </button>

        <button
          type="button"
          disabled={!creditEnabled}
          onClick={() => {
            if (!creditEnabled) {
              toast.message(creditDisabledReason || "Commercial credit unavailable.");
              return;
            }
            setPaymentMethod("credit");
          }}
          className={`rounded-2xl border p-4 text-left transition-colors ${
            paymentMethod === "credit"
              ? "border-sky-300 bg-sky-50/80 ring-2 ring-sky-100"
              : creditEnabled
                ? "border-slate-200 bg-white hover:border-slate-300"
                : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-70"
          }`}
        >
          <div className="flex items-center gap-2 text-slate-800">
            <Building2 className="h-4 w-4 text-sky-700" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Commercial Credit / Terms
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            {creditAccount?.approved ? (
              <>
                Available {formatCurrency(creditAccount.availableCredit)} ·{" "}
                {creditAccount.paymentTerms || "Net 30"}
                {!creditEnabled && creditDisabledReason ? (
                  <span className="mt-1 block font-semibold text-amber-800">
                    {creditDisabledReason}
                  </span>
                ) : null}
              </>
            ) : (
              <>
                Approved B2B accounts only.{" "}
                <Link
                  href="/credit-application"
                  className="font-semibold text-sky-700 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Apply for credit →
                </Link>
              </>
            )}
          </p>
        </button>
      </div>

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

      {paymentMethod === "credit" && creditAccount?.approved ? (
        <CommercialCreditCheckout
          account={creditAccount}
          customerEmail={checkoutEmail}
          shipping={shipping}
          agreedToPolicies={agreedToPolicies}
          orderTotal={orderTotal}
          onServerTotal={onServerTotal}
          onRequireAgreement={() => {
            toast.error(
              "Please agree to the Terms of Service and Refund Policy to continue."
            );
          }}
        />
      ) : (
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
          onServerTotal={onServerTotal}
        />
      )}

      <Button type="button" variant="outline" className="h-12 md:h-10" onClick={onBack}>
        Back to Shipping Method
      </Button>
    </div>
  );
}
