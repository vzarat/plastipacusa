import { CheckoutPageClient } from "@/components/checkout/CheckoutPageClient";
import { StagingQuotesNote } from "@/components/checkout/StagingQuotesNote";
import { profileIsTaxExempt } from "@/lib/sales-tax";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Embedded Stripe Elements checkout — requires an authenticated B2B session.
 * Guests are redirected to /login?redirect=/checkout by middleware + client gate.
 */
export default async function CheckoutPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let taxExempt = false;
  if (user?.id) {
    const { data, error } = await supabase
      .from("profiles")
      .select("is_tax_exempt, tax_exempt_verified")
      .eq("id", user.id)
      .maybeSingle();
    if (error && /tax_exempt_verified/i.test(error.message)) {
      const fallback = await supabase
        .from("profiles")
        .select("is_tax_exempt")
        .eq("id", user.id)
        .maybeSingle();
      taxExempt = profileIsTaxExempt(fallback.data);
    } else {
      taxExempt = profileIsTaxExempt(data);
    }
  }
  return (
    <>
      <StagingQuotesNote />
      <CheckoutPageClient taxExempt={taxExempt} />
    </>
  );
}
