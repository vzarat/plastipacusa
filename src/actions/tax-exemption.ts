"use server";

import { notifyAdminTaxExemption } from "@/lib/email";
import { createServerClient } from "@/lib/supabase/server";

const MAX_CERTIFICATE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export interface TaxExemptionResult {
  success: boolean;
  error?: string;
}

export async function submitTaxExemptionRequest(
  formData: FormData
): Promise<TaxExemptionResult> {
  const companyName = String(formData.get("companyName") || "").trim();
  const taxId = String(formData.get("taxId") || "").trim();
  const registrationState = String(formData.get("registrationState") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const customerEmail = String(formData.get("customerEmail") || "").trim();
  const customerName = String(formData.get("customerName") || "").trim();
  const shippingSummary = String(formData.get("shippingSummary") || "").trim();
  const file = formData.get("certificate");

  if (!companyName) return { success: false, error: "Company name is required." };
  if (!taxId) {
    return { success: false, error: "Tax ID or resale certificate number is required." };
  }
  if (!registrationState) {
    return { success: false, error: "State of registration is required." };
  }

  let attachment: { filename: string; content: Buffer } | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CERTIFICATE_BYTES) {
      return { success: false, error: "Certificate file must be 8 MB or smaller." };
    }
    if (file.type && !ALLOWED_TYPES.has(file.type)) {
      return { success: false, error: "Upload a PDF or image certificate." };
    }
    attachment = {
      filename: file.name || "tax-certificate",
      content: Buffer.from(await file.arrayBuffer()),
    };
  }

  let email = customerEmail;
  let name = customerName;
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!email && user?.email) email = user.email;
    if (!name) {
      const meta = user?.user_metadata as { full_name?: string } | undefined;
      name = meta?.full_name || name;
    }
  } catch {
    // The notification can still go out with the form fields.
  }

  const result = await notifyAdminTaxExemption(
    {
      companyName,
      taxId,
      registrationState,
      note: note || undefined,
      customerEmail: email || undefined,
      customerName: name || undefined,
      shippingSummary: shippingSummary || undefined,
      attachmentName: attachment?.filename,
    },
    attachment
  );

  if (!result.success && !result.skipped) {
    return {
      success: false,
      error: result.error || "Could not send the tax exemption request.",
    };
  }

  return { success: true };
}
