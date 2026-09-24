"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type CreditApplicationStatus = "pending" | "approved" | "rejected";

export interface CustomerDossier {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  phone: string;
  role: string;
  taxId: string;
  isTaxExempt: boolean;
  taxExemptionNumber: string;
  taxCertificateUrl: string | null;
  taxCertificateSignedUrl: string | null;
  taxExemptVerified: boolean;
  creditApplicationStatus: CreditApplicationStatus;
  creditLimit: number;
  creditTerms: string;
  createdAt: string | null;
}

export interface UpdateCustomerDossierInput {
  taxId?: string;
  isTaxExempt?: boolean;
  taxExemptionNumber?: string;
  taxExemptVerified?: boolean;
  creditApplicationStatus?: CreditApplicationStatus;
  creditLimit?: number;
  creditTerms?: string;
}

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") {
    return null;
  }
  return currentUser;
}

function normalizeCreditStatus(value: unknown): CreditApplicationStatus {
  const raw = String(value || "pending").toLowerCase();
  if (raw === "approved" || raw === "rejected") return raw;
  return "pending";
}

async function syncCompanyProfile(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  payload: Record<string, unknown>
) {
  try {
    await supabase.from("company_profiles").upsert(
      {
        user_id: userId,
        ...payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } catch {
    // company_profiles may not exist yet — profiles is source of truth
  }
}

export async function getAdminCustomerDossier(
  customerId: string
): Promise<CustomerDossier | null> {
  try {
    if (!(await requireAdmin()) || !customerId || !isSupabaseConfigured) {
      return null;
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, company_name, phone, role, tax_id, is_tax_exempt, tax_exemption_number, tax_certificate_url, tax_exempt_verified, credit_application_status, credit_limit, credit_terms, created_at"
      )
      .eq("id", customerId)
      .maybeSingle();

    if (error || !data) {
      console.warn(
        "getAdminCustomerDossier failed:",
        error?.message || "not found"
      );
      return null;
    }

    let signedUrl: string | null = null;
    const certUrl = data.tax_certificate_url as string | null;
    if (certUrl) {
      // Prefer private storage path: tax-certificates/{user_id}/...
      const marker = "tax-certificates/";
      const idx = certUrl.indexOf(marker);
      if (idx >= 0) {
        const path = certUrl.slice(idx + marker.length).split("?")[0];
        const { data: signed } = await supabase.storage
          .from("tax-certificates")
          .createSignedUrl(path, 60 * 30);
        signedUrl = signed?.signedUrl || null;
      } else if (certUrl.startsWith("http")) {
        signedUrl = certUrl;
      } else {
        const { data: signed } = await supabase.storage
          .from("tax-certificates")
          .createSignedUrl(certUrl, 60 * 30);
        signedUrl = signed?.signedUrl || null;
      }
    }

    return {
      id: data.id,
      email: data.email || "",
      fullName: data.full_name || "",
      companyName: data.company_name || "",
      phone: data.phone || "",
      role: data.role || "client",
      taxId: data.tax_id || "",
      isTaxExempt: Boolean(data.is_tax_exempt),
      taxExemptionNumber: data.tax_exemption_number || "",
      taxCertificateUrl: certUrl,
      taxCertificateSignedUrl: signedUrl,
      taxExemptVerified: Boolean(data.tax_exempt_verified),
      creditApplicationStatus: normalizeCreditStatus(
        data.credit_application_status
      ),
      creditLimit: Number(data.credit_limit || 0),
      creditTerms: data.credit_terms || "Registered",
      createdAt: data.created_at || null,
    };
  } catch (err) {
    console.warn("getAdminCustomerDossier exception:", err);
    return null;
  }
}

export async function updateAdminCustomerDossier(
  customerId: string,
  input: UpdateCustomerDossierInput
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await requireAdmin())) {
      return { success: false, error: "Unauthorized." };
    }
    if (!customerId || !isSupabaseConfigured) {
      return { success: false, error: "Invalid request." };
    }

    const patch: Record<string, unknown> = {};
    if (input.taxId !== undefined) patch.tax_id = String(input.taxId).trim();
    if (input.isTaxExempt !== undefined) {
      patch.is_tax_exempt = Boolean(input.isTaxExempt);
    }
    if (input.taxExemptionNumber !== undefined) {
      patch.tax_exemption_number = String(input.taxExemptionNumber).trim();
    }
    if (input.taxExemptVerified !== undefined) {
      patch.tax_exempt_verified = Boolean(input.taxExemptVerified);
    }
    if (input.creditApplicationStatus !== undefined) {
      patch.credit_application_status = normalizeCreditStatus(
        input.creditApplicationStatus
      );
    }
    if (input.creditLimit !== undefined) {
      patch.credit_limit = Math.max(0, Number(input.creditLimit) || 0);
    }
    if (input.creditTerms !== undefined) {
      patch.credit_terms = String(input.creditTerms).trim() || "Registered";
    }

    if (Object.keys(patch).length === 0) {
      return { success: false, error: "No changes provided." };
    }

    const supabase = await createServerClient();
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", customerId);

    if (error) {
      return { success: false, error: error.message || "Update failed." };
    }

    await syncCompanyProfile(supabase, customerId, {
      tax_id: patch.tax_id,
      is_tax_exempt: patch.is_tax_exempt,
      tax_exemption_number: patch.tax_exemption_number,
      tax_exempt_verified: patch.tax_exempt_verified,
      credit_application_status: patch.credit_application_status,
      credit_limit: patch.credit_limit,
      credit_terms: patch.credit_terms,
    });

    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath("/admin");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message || "Update failed." };
  }
}

/**
 * Persist B2B onboarding fields for the authenticated user (registration / settings).
 */
export async function upsertMyB2BProfile(input: {
  taxId?: string;
  isTaxExempt?: boolean;
  taxExemptionNumber?: string;
  taxCertificateUrl?: string | null;
  companyName?: string;
  phone?: string;
  /** When true, mark credit application as pending interest (Net 30) */
  applyForCredit?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSupabaseConfigured) {
      return { success: false, error: "Unauthorized." };
    }

    const supabase = await createServerClient();
    const patch: Record<string, unknown> = {
      id: currentUser.user.id,
      email: currentUser.user.email || currentUser.profile.email,
    };

    if (input.companyName !== undefined) {
      patch.company_name = String(input.companyName).trim();
    }
    if (input.phone !== undefined) patch.phone = String(input.phone).trim();
    if (input.taxId !== undefined) patch.tax_id = String(input.taxId).trim();
    if (input.isTaxExempt !== undefined) {
      patch.is_tax_exempt = Boolean(input.isTaxExempt);
    }
    if (input.taxExemptionNumber !== undefined) {
      patch.tax_exemption_number = String(input.taxExemptionNumber).trim();
    }
    if (input.taxCertificateUrl !== undefined) {
      patch.tax_certificate_url = input.taxCertificateUrl;
    }
    if (input.applyForCredit) {
      patch.credit_application_status = "pending";
      patch.credit_terms = "Net 30 (Pending Application)";
    }

    const { error } = await supabase.from("profiles").upsert(patch, {
      onConflict: "id",
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await syncCompanyProfile(supabase, currentUser.user.id, {
      company_name: patch.company_name,
      tax_id: patch.tax_id,
      is_tax_exempt: patch.is_tax_exempt,
      tax_exemption_number: patch.tax_exemption_number,
      tax_certificate_url: patch.tax_certificate_url,
      credit_application_status: patch.credit_application_status,
      credit_terms: patch.credit_terms,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Complete tax compliance from the dashboard modal (profile + optional certificate).
 */
export async function completeTaxComplianceProfile(
  formData: FormData
): Promise<{
  success: boolean;
  error?: string;
  applyForCredit?: boolean;
}> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSupabaseConfigured) {
      return { success: false, error: "Unauthorized." };
    }

    const taxIdRaw = String(formData.get("taxId") || "").trim();
    const isTaxExemptRaw = String(formData.get("isTaxExempt") || "");
    const taxExemptionNumber = String(
      formData.get("taxExemptionNumber") || ""
    ).trim();
    const applyForCredit = formData.get("applyForCredit") === "true";
    const file = formData.get("file");

    // US EIN: XX-XXXXXXX or 9 digits
    const digits = taxIdRaw.replace(/\D/g, "");
    if (digits.length !== 9) {
      return {
        success: false,
        error: "Enter a valid US TAX ID / FEIN (XX-XXXXXXX).",
      };
    }
    const taxId = `${digits.slice(0, 2)}-${digits.slice(2)}`;

    if (isTaxExemptRaw !== "true" && isTaxExemptRaw !== "false") {
      return {
        success: false,
        error: "Please indicate whether your business is sales-tax exempt.",
      };
    }
    const isTaxExempt = isTaxExemptRaw === "true";

    if (isTaxExempt) {
      const hasFile = file instanceof File && file.size > 0;
      if (!taxExemptionNumber && !hasFile) {
        return {
          success: false,
          error:
            "Provide a State Tax Exempt / Resale License Number or upload your certificate.",
        };
      }
    }

    let taxCertificateUrl: string | null | undefined = undefined;

    if (isTaxExempt && file instanceof File && file.size > 0) {
      const uploadFd = new FormData();
      uploadFd.append("file", file);
      const upload = await uploadTaxExemptionCertificate(uploadFd);
      if (!upload.success) {
        return { success: false, error: upload.error || "Certificate upload failed." };
      }
      taxCertificateUrl = upload.path || null;
    }

    const result = await upsertMyB2BProfile({
      taxId,
      isTaxExempt,
      taxExemptionNumber: isTaxExempt ? taxExemptionNumber : "",
      taxCertificateUrl:
        taxCertificateUrl !== undefined
          ? taxCertificateUrl
          : isTaxExempt
            ? undefined
            : null,
      applyForCredit,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, applyForCredit };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message || "Unable to save tax profile." };
  }
}

/**
 * Upload a tax exemption certificate into tax-certificates/{userId}/...
 * Call from the browser after auth (uses the server session cookies via server client
 * when invoked as a server action with FormData).
 */
export async function uploadTaxExemptionCertificate(
  formData: FormData
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSupabaseConfigured) {
      return { success: false, error: "Unauthorized." };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "Please select a certificate file." };
    }

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (file.type && !allowed.includes(file.type)) {
      return {
        success: false,
        error: "Upload a PDF or image certificate (PDF, JPG, PNG, WEBP).",
      };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "File must be 10MB or smaller." };
    }

    const ext =
      file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "pdf";
    const path = `${currentUser.user.id}/certificate-${Date.now()}.${ext}`;

    const supabase = await createServerClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("tax-certificates")
      .upload(path, buffer, {
        upsert: true,
        contentType: file.type || "application/pdf",
      });

    if (uploadError) {
      return {
        success: false,
        error: uploadError.message || "Certificate upload failed.",
      };
    }

    // Store storage path (not a public URL) — admins resolve via signed URL
    const storedRef = `tax-certificates/${path}`;
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: currentUser.user.id,
        email: currentUser.user.email || currentUser.profile.email,
        tax_certificate_url: storedRef,
        is_tax_exempt: true,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    await syncCompanyProfile(supabase, currentUser.user.id, {
      tax_certificate_url: storedRef,
      is_tax_exempt: true,
    });

    return { success: true, path: storedRef };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message || "Upload failed." };
  }
}
