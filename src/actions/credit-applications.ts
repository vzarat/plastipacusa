"use server";

import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export interface CreditApplicationInput {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  taxIdEin: string;
  billingAddress?: string;
  shippingAddress?: string;
  annualVolume?: string;
  creditReference1?: string;
  creditReference2?: string;
  creditReference3?: string;
  notes?: string;
}

export interface CreditApplicationResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function submitCreditApplication(
  input: CreditApplicationInput
): Promise<CreditApplicationResult> {
  const companyName = String(input.companyName || "").trim();
  const contactName = String(input.contactName || "").trim();
  const workEmail = String(input.workEmail || "").trim().toLowerCase();
  const phone = String(input.phone || "").trim();
  const taxIdEin = String(input.taxIdEin || "").trim();
  const billingAddress = String(input.billingAddress || "").trim();
  const shippingAddress = String(input.shippingAddress || "").trim();
  const annualVolume = String(input.annualVolume || "").trim();
  const creditReference1 = String(input.creditReference1 || "").trim();
  const creditReference2 = String(input.creditReference2 || "").trim();
  const creditReference3 = String(input.creditReference3 || "").trim();
  const notes = String(input.notes || "").trim();

  if (!companyName || !contactName || !workEmail) {
    return {
      success: false,
      error:
        "Please provide your company name, contact name, and corporate email.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
    return {
      success: false,
      error: "Please enter a valid corporate email address.",
    };
  }

  if (!phone) {
    return { success: false, error: "Please provide a business phone number." };
  }

  if (!taxIdEin) {
    return {
      success: false,
      error: "Please provide your Tax ID (EIN) for credit verification.",
    };
  }

  if (!creditReference1) {
    return {
      success: false,
      error: "Please provide at least one corporate credit reference.",
    };
  }

  const payload = {
    company_name: companyName,
    contact_name: contactName,
    work_email: workEmail,
    phone,
    tax_id_ein: taxIdEin,
    billing_address: billingAddress || null,
    shipping_address: shippingAddress || null,
    annual_volume: annualVolume || null,
    credit_reference_1: creditReference1 || null,
    credit_reference_2: creditReference2 || null,
    credit_reference_3: creditReference3 || null,
    notes: notes || null,
    status: "pending",
  };

  if (!isSupabaseConfigured) {
    return {
      success: false,
      error:
        "Credit applications are temporarily unavailable. Please call (956) 400-3683.",
    };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("credit_applications").insert(payload);

    if (error) {
      console.error("credit_applications insert failed:", error.message);
      return {
        success: false,
        error:
          error.message ||
          "Unable to submit credit application. Please try again or call our sales desk.",
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("submitCreditApplication failed:", message);
    return {
      success: false,
      error: "Unable to submit credit application. Please try again.",
    };
  }

  return {
    success: true,
    message:
      "Credit application received. A Plastipac USA credit specialist will review your account and follow up with Net 30 terms eligibility.",
  };
}
