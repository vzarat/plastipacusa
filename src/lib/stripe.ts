import { loadStripe, Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey || publishableKey.startsWith("sk_")) {
    console.error(
      "[stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a pk_… key (not sk_…)."
    );
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}
