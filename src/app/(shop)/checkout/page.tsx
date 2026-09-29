import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";

/**
 * Embedded Stripe Elements checkout — requires an authenticated B2B session.
 * Guests are redirected to /login?redirect=/checkout by middleware + client gate.
 */
export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
