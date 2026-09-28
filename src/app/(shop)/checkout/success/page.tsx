"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resolveCheckoutSession } from "@/actions/checkout";
import { createOrderFromCheckout, verifyPaymentIntent } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency, formatOrderId } from "@/lib/utils";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getDiscountedTotal = useCartStore((state) => state.getDiscountedTotal);

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [orderId, setOrderId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const hasTriggeredToast = useRef(false);
  const hasFinalized = useRef(false);

  useEffect(() => {
    if (status === "success" && !hasTriggeredToast.current) {
      hasTriggeredToast.current = true;
      toast.success("Order confirmed successfully.");
    }
  }, [status]);

  useEffect(() => {
    let active = true;

    const finalizeCheckout = async () => {
      if (hasFinalized.current) return;
      hasFinalized.current = true;

      try {
        const params = searchParams;
        let paymentIntentId = params.get("payment_intent") || "";
        const paymentIntentClientSecret =
          params.get("payment_intent_client_secret") || "";
        const sessionId = params.get("session_id") || "";
        const redirectStatus = params.get("redirect_status") || "";

        let shippingFromSession: Record<string, unknown> = {};

        // Embedded Elements return_url includes payment_intent=…
        // Legacy hosted Checkout may include session_id=…
        if (!paymentIntentId && sessionId) {
          const resolved = await resolveCheckoutSession(sessionId);
          if (!resolved.success || !resolved.paymentIntentId) {
            if (!active) return;
            setStatus("error");
            setErrorMessage(
              resolved.error ||
                "Unable to resolve the Stripe Checkout Session."
            );
            return;
          }
          paymentIntentId = resolved.paymentIntentId;
          shippingFromSession = {
            full_name: resolved.customerName,
            email: resolved.customerEmail,
            userId: resolved.userId,
            ...(resolved.shipping || {}),
          };
        }

        if (!paymentIntentId) {
          if (!active) return;
          setStatus("error");
          setErrorMessage(
            "The payment confirmation is missing. Please contact support."
          );
          return;
        }

        if (redirectStatus && redirectStatus !== "succeeded") {
          if (!active) return;
          setStatus("error");
          setErrorMessage(
            `Stripe reported payment status: ${redirectStatus}.`
          );
          return;
        }

        const verification = await verifyPaymentIntent(paymentIntentId);

        if (!active) return;

        if (verification.paymentIntent.status !== "succeeded") {
          setStatus("error");
          setErrorMessage(
            "The Stripe payment is still pending or was not completed successfully."
          );
          return;
        }

        // Do NOT require a Supabase session — paid PaymentIntent is sufficient.
        const snapshotItems = [...cartItems];
        const snapshotTotal = getDiscountedTotal();

        const result = await createOrderFromCheckout(
          paymentIntentId,
          snapshotItems,
          {
            payment_intent_client_secret: paymentIntentClientSecret,
            items_count: snapshotItems.length,
            subtotal: Number(getSubtotal().toFixed(2)),
            ...shippingFromSession,
          }
        );

        if (!active) return;

        if (!result.success) {
          setStatus("error");
          setErrorMessage(
            result.error || "Unable to save the order at this time."
          );
          return;
        }

        clearCart();
        setConfirmedTotal(
          snapshotTotal > 0
            ? snapshotTotal
            : Number(((verification.paymentIntent.amount || 0) / 100).toFixed(2))
        );
        setOrderId(result.orderId || paymentIntentId);
        setStatus("success");
      } catch (error: unknown) {
        if (!active) return;
        console.error("Checkout success processing error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while confirming your order."
        );
      }
    };

    void finalizeCheckout();

    return () => {
      active = false;
    };
    // Intentionally run once on mount with current cart snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total =
    confirmedTotal != null
      ? confirmedTotal
      : Number(getDiscountedTotal().toFixed(2));

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        {status === "loading" && (
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-sky-700">
              Confirming order
            </p>
            <h1 className="mt-4 text-3xl font-black text-slate-900">
              Processing your checkout...
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              We are verifying your Stripe payment and saving your order details.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
              Payment received
            </p>
            <h1 className="mt-4 text-3xl font-black text-slate-900">
              Thank you for your order
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              Your payment has been successfully processed and your order has
              been confirmed.
            </p>

            <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-left">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-600">Order ID</span>
                <span className="font-bold text-slate-900">
                  {orderId
                    ? formatOrderId({
                        id: orderId,
                        createdAt: new Date().toISOString(),
                        items: cartItems,
                      })
                    : "—"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-600">Total</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="gradient">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/products">Continue shopping</Link>
              </Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-600">
              Checkout issue
            </p>
            <h1 className="mt-4 text-3xl font-black text-slate-900">
              We could not confirm your order
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              {errorMessage ||
                "There was a problem completing the checkout process."}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="gradient">
                <Link href="/checkout">Return to checkout</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/products">Return to products</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
