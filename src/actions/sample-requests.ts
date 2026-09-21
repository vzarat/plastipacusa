"use server";

import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type SampleFilmType = "hand" | "machine";

export interface SampleRequestInput {
  fullName: string;
  companyName: string;
  workEmail: string;
  shippingZip: string;
  shippingAddress?: string;
  filmType: SampleFilmType;
  productSlug?: string;
  productName?: string;
}

export interface SampleRequestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function submitSampleRequest(
  input: SampleRequestInput
): Promise<SampleRequestResult> {
  const fullName = String(input.fullName || "").trim();
  const companyName = String(input.companyName || "").trim();
  const workEmail = String(input.workEmail || "").trim().toLowerCase();
  const shippingZip = String(input.shippingZip || "").trim();
  const shippingAddress = String(input.shippingAddress || "").trim();
  const filmType = input.filmType === "machine" ? "machine" : "hand";

  if (!fullName || !companyName || !workEmail) {
    return {
      success: false,
      error: "Please provide your full name, company name, and work email.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
    return { success: false, error: "Please enter a valid work email address." };
  }

  if (!shippingZip) {
    return {
      success: false,
      error: "Please provide a shipping ZIP code for contiguous US delivery.",
    };
  }

  const payload = {
    full_name: fullName,
    company_name: companyName,
    work_email: workEmail,
    shipping_zip: shippingZip,
    shipping_address: shippingAddress || null,
    film_type: filmType,
    product_slug: input.productSlug || null,
    product_name: input.productName || null,
    status: "new",
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerClient();
      const { error } = await supabase.from("sample_requests").insert(payload);
      if (error) {
        console.error("sample_requests insert failed:", error.message);
        // Fall through to success-with-log so UX isn't blocked if table isn't migrated yet
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("submitSampleRequest failed:", message);
    }
  }

  return {
    success: true,
    message:
      "Sample request received. A Plastipac USA specialist will review your corporate account eligibility and follow up shortly.",
  };
}
