"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createPaymentIntent,
  updatePaymentIntentShipping,
} from "@/actions/checkout";
import {
  persistCheckoutShipping,
  validateCheckoutShipping,
  type CheckoutShippingAddress,
} from "@/lib/shipping-address";
import { getStripe } from "@/lib/stripe";
import { BRAND_GRADIENT_CTA } from "@/lib/brand-styles";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import { calculateOrderTotal } from "@/lib/sales-tax";
import { formatCurrency } from "@/lib/utils";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { deliveryMethodLabel } from "@/lib/shipping-method";

const TEST_CARDS = [
  {
    id: "visa-success",
    label: "Visa success",
    number: "4242 4242 4242 4242",
    hint: "Any future expiry · any CVC · any ZIP",
  },
  {
    id: "visa-debit",
    label: "Visa debit",
    number: "4000 0566 5566 5556",
    hint: "Succeeds as debit",
  },
  {
    id: "decline",
    label: "Card declined",
    number: "4000 0000 0000 0002",
    hint: "Generic decline",
  },
] as const;

function isStripeTestMode(): boolean {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  return key.includes("_test_") || key.startsWith("pk_test");
}

interface StripeCheckoutFormInnerProps {
  amount: number;
  customerEmail: string;
  shipping: CheckoutShippingAddress;
  paymentIntentId: string | null;
  agreedToPolicies: boolean;
  onRequireAgreement: () => void;
}

function StripeCheckoutFormInner({
  amount,
  customerEmail,
  shipping,
  paymentIntentId,
  agreedToPolicies,
  onRequireAgreement,
}: StripeCheckoutFormInnerProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const copyTestCard = async (number: string, label: string) => {
    try {
      await navigator.clipboard.writeText(number.replace(/\s/g, ""));
      toast.success(`${label} copied — paste into the card field.`);
    } catch {
      toast.message(`Test card: ${number}`);
    }
  };

  const handlePay = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!agreedToPolicies) {
      onRequireAgreement();
      return;
    }

    if (!stripe || !elements) {
      setMessage("Stripe is still loading. Please wait a moment.");
      return;
    }

    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      toast.error("Enter a valid email before paying.");
      return;
    }

    const shippingError = validateCheckoutShipping(shipping);
    if (shippingError) {
      toast.error(shippingError);
      document.getElementById("checkout-shipping")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setIsSubmitting(true);
    persistCheckoutShipping(shipping);
    if (paymentIntentId) {
      const attached = await updatePaymentIntentShipping(paymentIntentId, shipping);
      if (!attached.success) {
        toast.error(attached.error || "Could not save the shipping address.");
        setIsSubmitting(false);
        return;
      }
    }
    try {
      const returnUrl = `${window.location.origin}/checkout/success`;
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: returnUrl,
          receipt_email: customerEmail.trim(),
          payment_method_data: {
            billing_details: {
              email: customerEmail.trim(),
            },
          },
        },
      });

      if (error) {
        const text = error.message || "Card authorization failed.";
        setMessage(text);
        toast.error(text);
        return;
      }

      if (
        paymentIntent?.status === "succeeded" ||
        paymentIntent?.status === "processing"
      ) {
        router.push(
          `/checkout/success?payment_intent=${encodeURIComponent(paymentIntent.id)}&redirect_status=succeeded`
        );
        return;
      }

      const text = "Card authorization failed. Please try another card.";
      setMessage(text);
      toast.error(text);
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage(text);
      toast.error(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-5">
      {isStripeTestMode() && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Stripe test mode — quick cards
          </p>
          <div className="flex flex-wrap gap-2">
            {TEST_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => void copyTestCard(card.number, card.label)}
                className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-amber-100/60 transition-colors cursor-pointer"
                title={card.hint}
              >
                <span className="block font-bold text-slate-900">{card.label}</span>
                <span className="font-mono text-[11px] text-slate-600">
                  {card.number}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-amber-900/80 leading-relaxed">
            Click a card to copy the number, then paste it into the Stripe card
            field (iframes cannot be auto-filled for security).
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: {
              billingDetails: {
                email: customerEmail || undefined,
              },
            },
          }}
        />
      </div>

      {message && (
        <p className="text-xs font-semibold text-red-600" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting || !agreedToPolicies}
        className={`${BRAND_GRADIENT_CTA} py-3.5 px-6 rounded-xl w-full flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Processing payment…
          </>
        ) : (
          <>Pay {formatCurrency(amount)} with Stripe</>
        )}
      </button>

      {!agreedToPolicies && (
        <p className="text-[11px] text-center text-slate-500">
          Agree to the Terms of Service to enable payment.
        </p>
      )}
    </form>
  );
}

interface StripeEmbeddedCheckoutProps {
  customerEmail: string;
  shipping: CheckoutShippingAddress;
  shippingAmount?: number;
  agreedToPolicies: boolean;
  onRequireAgreement: () => void;
}

/**
 * Embedded Stripe Payment Element — no hosted Checkout redirect.
 */
export function StripeEmbeddedCheckout({
  customerEmail,
  shipping,
  shippingAmount = 0,
  agreedToPolicies,
  onRequireAgreement,
}: StripeEmbeddedCheckoutProps) {
  const items = useCartStore((s) => s.items);
  const { selectedAddress, deliveryMethod, taxExemptRequested } = useCheckoutState();
  const subtotal = useCartStore((s) => s.getSubtotal());
  const discountAmount = useCartStore((s) => s.getDiscountAmount());
  const quote = calculateOrderTotal({
    subtotal,
    discount: discountAmount,
    shipping: shippingAmount,
  });
  const amount = quote.total;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);

  const stripePromise = useMemo(() => getStripe(), []);
  const itemsSummary = useMemo(
    () =>
      items
        .map((item) => `${item.quantity}× ${item.productName}`)
        .join("; ")
        .slice(0, 450),
    [items]
  );

  useEffect(() => {
    let cancelled = false;

    const prepare = async () => {
      setIsPreparing(true);
      setInitError(null);
      setClientSecret(null);

      if (!stripePromise) {
        if (!cancelled) {
          setInitError(
            "Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_…)."
          );
          setIsPreparing(false);
        }
        return;
      }

      if (amount <= 0) {
        if (!cancelled) {
          setInitError("Your cart total must be greater than zero.");
          setIsPreparing(false);
        }
        return;
      }

      const result = await createPaymentIntent(amount, {
        customerEmail,
        customerName: shipping.fullName,
        companyName: selectedAddress?.companyName || shipping.line2,
        itemsSummary,
        productSlugs: items.map((item) => item.productSlug).filter(Boolean),
        subtotal: quote.subtotal,
        discountAmount: quote.discount,
        shippingAmount: quote.shipping,
        shippingMethod: deliveryMethodLabel(deliveryMethod),
        shippingAddressId: selectedAddress?.id,
        taxExemptRequested,
        lineItems: items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        shipping,
      });

      if (cancelled) return;

      if (!result.success || !result.clientSecret) {
        setInitError(result.error || "Unable to initialize Stripe payment.");
        setIsPreparing(false);
        return;
      }

      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.paymentIntentId || null);
      setIsPreparing(false);
    };

    void prepare();
    return () => {
      cancelled = true;
    };
    // Receipt email is applied at confirmPayment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    amount,
    items,
    itemsSummary,
    stripePromise,
    deliveryMethod,
    taxExemptRequested,
    selectedAddress?.id,
    shipping.fullName,
    shipping.line1,
    shipping.city,
    shipping.state,
    shipping.postalCode,
    shipping.phone,
  ]);

  if (isPreparing) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
        Preparing secure payment form…
      </div>
    );
  }

  if (initError || !clientSecret || !stripePromise) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {initError || "Unable to load Stripe Elements."}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#0284c7",
            borderRadius: "12px",
          },
        },
      }}
    >
      <StripeCheckoutFormInner
        amount={amount}
        customerEmail={customerEmail}
        shipping={shipping}
        paymentIntentId={paymentIntentId}
        agreedToPolicies={agreedToPolicies}
        onRequireAgreement={onRequireAgreement}
      />
    </Elements>
  );
}

export default StripeEmbeddedCheckout;
