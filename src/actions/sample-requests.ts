"use server";

import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type SampleFilmType = "hand" | "machine";

export interface SampleRequestInput {
  fullName: string;
  companyName: string;
  workEmail: string;
  phone?: string;
  shippingZip: string;
  shippingAddress?: string;
  filmType: SampleFilmType;
  preferredGauge?: string;
  preferredWidth?: string;
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
  const phone = String(input.phone || "").trim();
  const shippingZip = String(input.shippingZip || "").trim();
  const shippingAddress = String(input.shippingAddress || "").trim();
  const preferredGauge = String(input.preferredGauge || "").trim();
  const preferredWidth = String(input.preferredWidth || "").trim();
  const filmType = input.filmType === "machine" ? "machine" : "hand";

  if (!fullName || !companyName || !workEmail) {
    return {
      success: false,
      error: "Please provide your full name, company name, and corporate email.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) {
    return { success: false, error: "Please enter a valid corporate email address." };
  }

  if (!phone) {
    return { success: false, error: "Please provide a phone number." };
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
    phone: phone || null,
    shipping_zip: shippingZip,
    shipping_address: shippingAddress || null,
    film_type: filmType,
    preferred_gauge: preferredGauge || null,
    preferred_width: preferredWidth || null,
    product_slug: input.productSlug || null,
    product_name: input.productName || null,
    status: "new",
  };

  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: "Sample requests are temporarily unavailable. Please call (956) 400 36 83.",
    };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("sample_requests").insert(payload);

    if (error) {
      console.error("sample_requests insert failed:", error.message);
      // Retry without optional columns if schema is older
      const legacyPayload = {
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
      const retry = await supabase.from("sample_requests").insert(legacyPayload);
      if (retry.error) {
        return {
          success: false,
          error:
            retry.error.message ||
            "Unable to submit sample request. Please try again or call our sales desk.",
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("submitSampleRequest failed:", message);
    return {
      success: false,
      error: "Unable to submit sample request. Please try again.",
    };
  }

  return {
    success: true,
    message:
      "Sample request received. A Plastipac USA specialist will review your corporate account eligibility and follow up shortly.",
  };
}
