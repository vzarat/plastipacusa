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
  let creditAccount: {
    approved: boolean;
    availableCredit: number;
    creditLimit: number;
    paymentTerms: string;
  } | null = null;

  if (user?.id) {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "is_tax_exempt, tax_exempt_verified, credit_application_status, credit_limit, available_credit, payment_terms, credit_terms"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error && /available_credit|payment_terms|tax_exempt_verified/i.test(error.message)) {
      const fallback = await supabase
        .from("profiles")
        .select(
          "is_tax_exempt, tax_exempt_verified, credit_application_status, credit_limit, credit_terms"
        )
        .eq("id", user.id)
        .maybeSingle();
      taxExempt = profileIsTaxExempt(fallback.data);
      const approved =
        String(fallback.data?.credit_application_status || "").toLowerCase() ===
        "approved";
      const creditLimit = Math.max(0, Number(fallback.data?.credit_limit || 0));
      creditAccount = {
        approved,
        creditLimit,
        availableCredit: approved ? creditLimit : 0,
        paymentTerms: String(fallback.data?.credit_terms || "Net 30"),
      };
    } else {
      taxExempt = profileIsTaxExempt(data);
      const approved =
        String(data?.credit_application_status || "").toLowerCase() === "approved";
      const creditLimit = Math.max(0, Number(data?.credit_limit || 0));
      const availableRaw = data?.available_credit;
      const availableCredit =
        availableRaw == null || availableRaw === ""
          ? approved
            ? creditLimit
            : 0
          : Math.max(0, Number(availableRaw) || 0);
      creditAccount = {
        approved,
        creditLimit,
        availableCredit,
        paymentTerms: String(data?.payment_terms || data?.credit_terms || "Net 30"),
      };
    }
  }

  return (
    <>
      <StagingQuotesNote />
      <CheckoutPageClient taxExempt={taxExempt} creditAccount={creditAccount} />
    </>
  );
}
