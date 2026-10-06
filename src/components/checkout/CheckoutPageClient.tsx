"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CheckoutCartStep } from "@/components/checkout/CheckoutCartStep";
import { CheckoutPaymentStep } from "@/components/checkout/CheckoutPaymentStep";
import { ShipmentOriginSummary } from "@/components/checkout/ShipmentOriginSummary";
import { CheckoutAddressStep } from "@/components/checkout/CheckoutAddressStep";
import { CheckoutShippingMethodStep } from "@/components/checkout/CheckoutShippingMethodStep";
import {
  CheckoutStateProvider,
  useCheckoutState,
} from "@/components/checkout/CheckoutStateContext";
import {
  CheckoutStepper,
  type CheckoutStepId,
} from "@/components/checkout/CheckoutStepper";
import { Button } from "@/components/ui/button";
import { TaxExemptionInformationButton } from "@/components/checkout/TaxExemptionModal";
import { useCartStore } from "@/lib/store/useCartStore";
import { calculateOrderTotal, roundMoney } from "@/lib/sales-tax";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { savedAddressToCheckout } from "@/lib/saved-shipping-address";
import {
  activeShippingMethod,
  buildShippingOffer,
  countCartBoxes,
  estimateShippingCost,
} from "@/lib/shipping-method";
import {
  EMPTY_CHECKOUT_SHIPPING,
  persistCheckoutShipping,
  validateCheckoutShipping,
  type CheckoutShippingAddress,
} from "@/lib/shipping-address";

export function CheckoutPageClient() {
  return (
    <CheckoutStateProvider>
      <CheckoutPageInner />
    </CheckoutStateProvider>
  );
}

function CheckoutPageInner() {
  const router = useRouter();
  const [step, setStep] = useState<CheckoutStepId>(1);
  const [furthestStep, setFurthestStep] = useState<CheckoutStepId>(1);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const items = useCartStore((state) => state.items);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getDiscountAmount = useCartStore((state) => state.getDiscountAmount);
  const appliedCoupon = useCartStore((state) => state.appliedCoupon);
  const getTotalWeight = useCartStore((state) => state.getTotalWeight);
  const clearCart = useCartStore((state) => state.clearCart);

  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [shipping, setShipping] = useState<CheckoutShippingAddress>(
    EMPTY_CHECKOUT_SHIPPING
  );
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cartReady, setCartReady] = useState(
    () => useCartStore.persist.hasHydrated()
  );
  const emptyCartRedirected = useRef(false);
  const {
    selectedAddress,
    deliveryMethod,
    setDeliveryMethod,
    taxExemptRequested,
    setTaxExemptRequested,
  } = useCheckoutState();

  useEffect(() => {
    const openDestination = () => {
      setStep(2);
      setFurthestStep((current) => (current < 2 ? 2 : current));
    };
    if (sessionStorage.getItem("plastipac_mobile_tour_focus") === "destination") {
      openDestination();
    }
    sessionStorage.removeItem("plastipac_mobile_tour_focus");
    const onFocus = (event: Event) => {
      if ((event as CustomEvent<string>).detail === "destination") openDestination();
    };
    window.addEventListener("plastipac:mobile-tour-focus", onFocus);
    return () => window.removeEventListener("plastipac:mobile-tour-focus", onFocus);
  }, []);

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setCartReady(true);
    }
    return useCartStore.persist.onFinishHydration(() => {
      setCartReady(true);
    });
  }, []);

  useEffect(() => {
    if (!cartReady || authChecking || !isAuthenticated) return;
    if (items.length > 0 || emptyCartRedirected.current) return;
    emptyCartRedirected.current = true;
    toast("Your cart is empty.");
    router.replace("/products");
  }, [authChecking, cartReady, isAuthenticated, items.length, router]);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      setAuthChecking(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user?.id) {
          setIsAuthenticated(true);
          if (user.email) {
            setCheckoutEmail((prev) => prev || user.email || "");
          }
        } else {
          setIsAuthenticated(false);
          router.replace("/login?redirect=/checkout");
        }
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };

    void verifySession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount();
  const totalWeight = getTotalWeight();
  const boxCount = countCartBoxes(items);
  const shippingOffer = buildShippingOffer({
    city: selectedAddress?.city,
    state: selectedAddress?.state,
    postalCode: selectedAddress?.postalCode,
    boxCount,
    weightLbs: totalWeight,
  });
  const activeMethod = activeShippingMethod(deliveryMethod, shippingOffer);
  const shippingEstimate =
    furthestStep >= 3
      ? estimateShippingCost(activeMethod, totalWeight, boxCount)
      : 0;

  useEffect(() => {
    if (deliveryMethod !== activeMethod) {
      setDeliveryMethod(activeMethod);
    }
  }, [activeMethod, deliveryMethod, setDeliveryMethod]);
  const quote = calculateOrderTotal({
    subtotal,
    discount: discountAmount,
    shipping: shippingEstimate,
  });
  const showTax = step === 4;
  const total = showTax
    ? quote.total
    : roundMoney(quote.subtotal - quote.discount + quote.shipping);

  const goToStep = (next: CheckoutStepId) => {
    if (next > furthestStep) return;
    if (next >= 3 && !selectedAddress) {
      toast.error("Select or add a shipping address before continuing.");
      setStep(2);
      return;
    }
    if (next >= 3 && selectedAddress) {
      const mapped = savedAddressToCheckout(selectedAddress);
      const shippingError = validateCheckoutShipping(mapped);
      if (shippingError) {
        toast.error(shippingError);
        setStep(2);
        return;
      }
      setShipping(mapped);
      persistCheckoutShipping(mapped);
    }
    setStep(next);
  };

  const proceedToShipping = () => {
    if (items.length === 0) return;
    setFurthestStep((current) => (current < 2 ? 2 : current));
    setStep(2);
  };

  const proceedToShippingMethod = () => {
    if (!selectedAddress) {
      toast.error("Select or add a shipping address before continuing.");
      return;
    }
    const mapped = savedAddressToCheckout(selectedAddress);
    const shippingError = validateCheckoutShipping(mapped);
    if (shippingError) {
      toast.error(shippingError);
      return;
    }
    setShipping(mapped);
    persistCheckoutShipping(mapped);
    setFurthestStep((current) => (current < 3 ? 3 : current));
    setStep(3);
  };

  const proceedToPayment = () => {
    if (!selectedAddress) {
      toast.error("Select a shipping address before payment.");
      setStep(2);
      return;
    }
    setFurthestStep((current) => (current < 4 ? 4 : current));
    setStep(4);
  };

  if (authChecking || !isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-4xl items-center justify-center px-6 py-16">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          Verifying session…
        </div>
      </main>
    );
  }

  const continueCheckout = () => {
    if (step === 1) {
      proceedToShipping();
      return;
    }
    if (step === 2) {
      proceedToShippingMethod();
      return;
    }
    if (step === 3) {
      proceedToPayment();
      return;
    }
    document.getElementById("checkout-stripe-pay")?.click();
  };

  const mobileActionDisabled =
    (step === 1 && items.length === 0) ||
    ((step === 2 || step === 3) && !selectedAddress) ||
    (step === 4 && !agreedToPolicies);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10 md:pb-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
            Checkout
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            Secure checkout
          </h1>
        </div>

        <Button asChild variant="outline" className="hidden sm:inline-flex">
          <Link href="/products">Back to catalog</Link>
        </Button>
      </div>

      <div className="mb-8 rounded-3xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6">
        <CheckoutStepper
          currentStep={step}
          furthestStep={furthestStep}
          onStepChange={goToStep}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
          {step === 1 && (
            <CheckoutCartStep
              checkoutEmail={checkoutEmail}
              onProceed={proceedToShipping}
            />
          )}
          {step === 2 && (
            <CheckoutAddressStep
              onBack={() => setStep(1)}
              onProceed={proceedToShippingMethod}
            />
          )}
          {step === 3 && (
            <CheckoutShippingMethodStep
              checkoutEmail={checkoutEmail}
              onBack={() => setStep(2)}
              onProceed={proceedToPayment}
            />
          )}
          {step === 4 && (
            <CheckoutPaymentStep
              agreedToPolicies={agreedToPolicies}
              onAgreedToPoliciesChange={setAgreedToPolicies}
              checkoutEmail={checkoutEmail}
              onCheckoutEmailChange={setCheckoutEmail}
              shipping={shipping}
              shippingAmount={shippingEstimate}
              onBack={() => setStep(3)}
              onEditAddress={() => setStep(2)}
              onEditMethod={() => setStep(3)}
            />
          )}
        </div>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6 lg:sticky lg:top-6 lg:col-span-5">
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-between gap-3 text-left md:hidden"
            aria-expanded={summaryOpen}
            onClick={() => setSummaryOpen((open) => !open)}
          >
            <span className="text-sm font-bold text-slate-900">
              {`View Order Summary (${itemCount} items) - ${formatCurrency(total)}`}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                summaryOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>

          <div className={summaryOpen ? "mt-4 md:mt-0" : "hidden md:block"}>
          <h2 className="hidden text-lg font-black text-slate-900 md:block">
            Order summary
          </h2>

          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.productName}
                  </p>
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

          {(step === 3 || step === 4) && <ShipmentOriginSummary />}

          <div className="mt-6 space-y-3 border-t border-slate-200 pt-4 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Weight</span>
              <span className="font-semibold text-slate-800">
                {totalWeight} lbs
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {appliedCoupon && discountAmount > 0 && (
              <>
                <div className="flex items-center justify-between text-emerald-700 font-bold">
                  <span className="inline-flex items-center gap-1.5">
                    Discount
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md">
                      {appliedCoupon.code}
                    </span>
                  </span>
                  <span>- {formatCurrency(discountAmount)} USD</span>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800">
                  Total savings: {formatCurrency(discountAmount)} USD
                </div>
              </>
            )}
            {furthestStep >= 3 && (
              <div className="flex items-center justify-between text-slate-600">
                <span>Estimated shipping</span>
                <span className="font-semibold text-slate-800">
                  {quote.shipping > 0 ? formatCurrency(quote.shipping) : "FREE"}
                </span>
              </div>
            )}
            {showTax && (
              <>
                {taxExemptRequested && (
                  <p className="text-xs font-semibold text-emerald-700">
                    Tax exemption requested. Tax remains until verification.
                  </p>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Estimated Tax</span>
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(quote.tax)}
                    </span>
                  </div>
                  <TaxExemptionInformationButton
                    companyName={selectedAddress?.companyName}
                    registrationState={selectedAddress?.state}
                    customerEmail={checkoutEmail}
                    customerName={selectedAddress?.fullName}
                    shippingSummary={
                      selectedAddress
                        ? `${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postalCode}`
                        : undefined
                    }
                    onSubmitted={() => setTaxExemptRequested(true)}
                  />
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-lg font-black text-slate-900">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
            Payment is completed in the left column using Stripe&apos;s embedded
            Payment Element. You will return here after confirmation.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-4 h-12 w-full md:h-10"
            onClick={() => clearCart()}
          >
            Clear cart
          </Button>
          </div>
        </aside>
      </div>

      <div
        data-tour="tour-mobile-bar"
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-lg md:hidden"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total
            </p>
            <p className="truncate text-lg font-black text-slate-900">
              {formatCurrency(total)}
            </p>
          </div>
          <Button
            type="button"
            variant="gradient"
            className="h-12 shrink-0 px-5"
            onClick={continueCheckout}
            disabled={mobileActionDisabled}
          >
            {step === 4 ? "Place Order" : "Proceed to Checkout"}
          </Button>
        </div>
      </div>
    </main>
  );
}
