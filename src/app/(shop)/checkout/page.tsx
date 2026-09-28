import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";

/**
 * Embedded Stripe Elements checkout — guests may pay with email;
 * signed-in users are still preferred when a session cookie is present.
 */
export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
