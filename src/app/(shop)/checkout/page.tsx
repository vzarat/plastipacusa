import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";

export default async function CheckoutPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/checkout");
  }

  return <CheckoutPageClient />;
}
