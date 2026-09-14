"use client";

import { FormEvent, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error("Stripe is not ready yet. Please try again.");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Processing your payment...");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    toast.dismiss(loadingToast);
    setIsProcessing(false);

    if (error) {
      toast.error(error.message || "Something went wrong while processing your payment.");
    }
  };

  return (
    <>
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sky-100">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
              </div>

              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">
                Payment processing
              </p>
              <h3 className="mt-3 text-2xl font-black text-slate-900">
                Processing your payment...
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Please do not close or refresh this page. We are securing your order now.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <PaymentElement options={{ layout: "tabs" }} />
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={!stripe || !elements || isProcessing}
        >
          {isProcessing ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-white" />
              Processing...
            </span>
          ) : (
            "Pay now"
          )}
        </Button>
      </form>
    </>
  );
}
