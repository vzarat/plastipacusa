"use server";

import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type CreditApplicationStatus = "pending" | "approved" | "rejected";

export interface CreditApplicationInput {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  taxIdEin: string;
  billingAddress?: string;
  shippingAddress?: string;
  /** Always "United States" — credit terms are US-only */
  country?: string;
  annualVolume?: string;
  desiredCreditLimit?: string;
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

export interface AdminCreditApplication {
  id: string;
  userId: string | null;
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  taxIdEin: string;
  billingAddress: string | null;
  shippingAddress: string | null;
  annualVolume: string | null;
  creditReference1: string | null;
  creditReference2: string | null;
  creditReference3: string | null;
  notes: string | null;
  status: CreditApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
}

function normalizeStatus(value: unknown): CreditApplicationStatus {
  const raw = String(value || "pending").toLowerCase();
  if (raw === "approved" || raw === "rejected") return raw;
  return "pending";
}

function mapCreditApplicationRow(row: Record<string, unknown>): AdminCreditApplication {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    companyName: String(row.company_name || ""),
    contactName: String(row.contact_name || ""),
    workEmail: String(row.work_email || ""),
    phone: String(row.phone || ""),
    taxIdEin: String(row.tax_id_ein || ""),
    billingAddress: (row.billing_address as string | null) || null,
    shippingAddress: (row.shipping_address as string | null) || null,
    annualVolume: (row.annual_volume as string | null) || null,
    creditReference1: (row.credit_reference_1 as string | null) || null,
    creditReference2: (row.credit_reference_2 as string | null) || null,
    creditReference3: (row.credit_reference_3 as string | null) || null,
    notes: (row.notes as string | null) || null,
    status: normalizeStatus(row.status),
    createdAt: String(row.created_at || new Date().toISOString()),
    reviewedAt: (row.reviewed_at as string | null) || null,
  };
}

async function sendCreditApplicationEmail(payload: {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  taxIdEin: string;
  billingAddress: string;
  shippingAddress: string;
  annualVolume: string;
  creditReference1: string;
  creditReference2: string;
  creditReference3: string;
  notes: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const adminEmail =
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "vzarat96@gmail.com";

  try {
    const resend = new Resend(resendApiKey);
    const lines = [
      "New B2B Credit Application",
      "",
      `Company: ${payload.companyName}`,
      `Contact: ${payload.contactName}`,
      `Email: ${payload.workEmail}`,
      `Phone: ${payload.phone}`,
      `Tax ID / EIN: ${payload.taxIdEin}`,
      `Billing Address: ${payload.billingAddress || "—"}`,
      `Shipping Address: ${payload.shippingAddress || "—"}`,
      `Estimated Annual Volume: ${payload.annualVolume || "—"}`,
      `Credit Reference 1: ${payload.creditReference1 || "—"}`,
      `Credit Reference 2: ${payload.creditReference2 || "—"}`,
      `Credit Reference 3: ${payload.creditReference3 || "—"}`,
      `Notes: ${payload.notes || "—"}`,
      "",
      "Review in Admin → Credit Applications",
    ];

    await resend.emails.send({
      from: "Plastipac Credit <onboarding@resend.dev>",
      to: [adminEmail],
      replyTo: payload.workEmail,
      subject: `B2B Credit Application — ${payload.companyName}`,
      text: lines.join("\n"),
    });
  } catch (emailError) {
    console.error("credit application email dispatch error:", emailError);
  }
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
  const country = String(input.country || "United States").trim() || "United States";
  const annualVolume = String(input.annualVolume || "").trim();
  const desiredCreditLimit = String(input.desiredCreditLimit || "").trim();
  const creditReference1 = String(input.creditReference1 || "").trim();
  const creditReference2 = String(input.creditReference2 || "").trim();
  const creditReference3 = String(input.creditReference3 || "").trim();
  const notes = String(input.notes || "").trim();

  // Ensure country is present on stored address lines (US-only program).
  const withCountry = (address: string) => {
    if (!address) return null;
    if (/united states|\busa\b/i.test(address)) return address;
    return `${address}, ${country}`;
  };
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

  // Tax ID is preferred but optional on the dashboard short-form application.
  // Full public form still requires at least one credit reference when no desired limit is given.
  if (!creditReference1 && !desiredCreditLimit) {
    return {
      success: false,
      error:
        "Please provide at least one corporate credit reference, or a desired credit limit.",
    };
  }

  const payload = {
    company_name: companyName,
    contact_name: contactName,
    work_email: workEmail,
    phone,
    tax_id_ein: taxIdEin,
    billing_address: withCountry(billingAddress),
    shipping_address: withCountry(shippingAddress),
    annual_volume: annualVolume || null,
    credit_reference_1: creditReference1 || null,
    credit_reference_2: creditReference2 || null,
    credit_reference_3: creditReference3 || null,
    notes: [
      notes ? notes : null,
      desiredCreditLimit
        ? `Desired credit limit: $${desiredCreditLimit}`
        : null,
      `Country: ${country}`,
    ]
      .filter(Boolean)
      .join("\n"),
    status: "pending" as const,
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
    const currentUser = await getCurrentUser();

    const insertPayload: Record<string, unknown> = {
      ...payload,
    };
    if (currentUser?.user?.id) {
      insertPayload.user_id = currentUser.user.id;
    }

    const { error } = await supabase
      .from("credit_applications")
      .insert(insertPayload);

    if (error) {
      // Retry without user_id if column not migrated yet
      if (/user_id|schema cache/i.test(error.message || "")) {
        const { error: fallbackError } = await supabase
          .from("credit_applications")
          .insert(payload);
        if (fallbackError) {
          console.warn(
            "credit_applications insert failed:",
            fallbackError.message || fallbackError.code || "unknown error"
          );
          return {
            success: false,
            error:
              fallbackError.message ||
              "Unable to submit credit application. Please try again or call our sales desk.",
          };
        }
      } else {
        console.warn(
          "credit_applications insert failed:",
          error.message || error.code || "unknown error"
        );
        return {
          success: false,
          error:
            error.message ||
            "Unable to submit credit application. Please try again or call our sales desk.",
        };
      }
    }

    // Mirror EIN + pending credit status onto the authenticated profile when possible
    if (currentUser?.user?.id) {
      try {
        await supabase.from("profiles").upsert({
          id: currentUser.user.id,
          email: currentUser.user.email || workEmail,
          company_name: companyName,
          phone,
          tax_id: taxIdEin,
          credit_application_status: "pending",
        });
        await supabase.from("company_profiles").upsert(
          {
            user_id: currentUser.user.id,
            company_name: companyName,
            tax_id: taxIdEin,
            credit_application_status: "pending",
          },
          { onConflict: "user_id" }
        );
      } catch {
        // non-fatal
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("submitCreditApplication failed:", message);
    return {
      success: false,
      error: "Unable to submit credit application. Please try again.",
    };
  }

  // Notify admin after a successful DB write (email failure must not fail the submit).
  await sendCreditApplicationEmail({
    companyName,
    contactName,
    workEmail,
    phone,
    taxIdEin,
    billingAddress: withCountry(billingAddress) || "",
    shippingAddress: withCountry(shippingAddress) || "",
    annualVolume,
    creditReference1,
    creditReference2,
    creditReference3,
    notes: [
      notes || null,
      desiredCreditLimit ? `Desired credit limit: $${desiredCreditLimit}` : null,
      `Country: ${country}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  revalidatePath("/admin/credit-applications");
  revalidatePath("/dashboard/credit");
  revalidatePath("/dashboard");

  return {
    success: true,
    message:
      "Credit application received. A Plastipac USA credit specialist will review your account and follow up with Net 30 terms eligibility.",
  };
}

/**
 * Fetch all credit applications for the admin dashboard (newest first).
 */
export async function getAdminCreditApplications(): Promise<
  AdminCreditApplication[]
> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.profile.role !== "admin") {
      return [];
    }

    if (!isSupabaseConfigured) return [];

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("credit_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(
        "getAdminCreditApplications failed:",
        error.message || error.code || "unknown error"
      );
      return [];
    }

    return (data || []).map((row) =>
      mapCreditApplicationRow(row as Record<string, unknown>)
    );
  } catch (err) {
    console.warn("getAdminCreditApplications exception:", err);
    return [];
  }
}

/**
 * Approve or reject a credit application (admin only).
 */
export async function updateCreditApplicationStatus(
  id: string,
  status: CreditApplicationStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.profile.role !== "admin") {
      return { success: false, error: "Unauthorized." };
    }

    if (!id) {
      return { success: false, error: "Missing application id." };
    }

    if (status !== "pending" && status !== "approved" && status !== "rejected") {
      return { success: false, error: "Invalid status." };
    }

    if (!isSupabaseConfigured) {
      return { success: false, error: "Database is not configured." };
    }

    const supabase = await createServerClient();

    // Load application so we can sync the linked profile
    const { data: application } = await supabase
      .from("credit_applications")
      .select("id, user_id, work_email, tax_id_ein, company_name")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase
      .from("credit_applications")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUser.user.id,
      })
      .eq("id", id);

    if (error) {
      // Fallback if reviewed_* columns are not yet migrated
      if (
        /reviewed_at|reviewed_by|schema cache/i.test(error.message || "")
      ) {
        const { error: fallbackError } = await supabase
          .from("credit_applications")
          .update({ status })
          .eq("id", id);

        if (fallbackError) {
          console.warn(
            "updateCreditApplicationStatus failed:",
            fallbackError.message
          );
          return {
            success: false,
            error: fallbackError.message || "Failed to update status.",
          };
        }
      } else {
        console.warn("updateCreditApplicationStatus failed:", error.message);
        return {
          success: false,
          error: error.message || "Failed to update status.",
        };
      }
    }

    // Sync credit status onto profiles / company_profiles when linked
    try {
      let profileId = application?.user_id as string | null;
      if (!profileId && application?.work_email) {
        const { data: byEmail } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", String(application.work_email).toLowerCase())
          .maybeSingle();
        profileId = byEmail?.id || null;
      }

      if (profileId) {
        const profilePatch: Record<string, unknown> = {
          credit_application_status: status,
        };
        if (status === "approved") {
          profilePatch.credit_terms = "Net 30";
          profilePatch.credit_limit = 10000;
        }
        if (application?.tax_id_ein) {
          profilePatch.tax_id = application.tax_id_ein;
        }
        if (application?.company_name) {
          profilePatch.company_name = application.company_name;
        }

        await supabase.from("profiles").update(profilePatch).eq("id", profileId);
        await supabase.from("company_profiles").upsert(
          {
            user_id: profileId,
            ...profilePatch,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }
    } catch {
      // non-fatal sync
    }

    revalidatePath("/admin/credit-applications");
    revalidatePath("/admin");
    revalidatePath("/dashboard/credit");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("updateCreditApplicationStatus exception:", message);
    return { success: false, error: "Failed to update status." };
  }
}

export type MyCreditStatus =
  | "not_applied"
  | "pending"
  | "approved"
  | "rejected";

export interface MyCreditStatusInfo {
  status: MyCreditStatus;
  creditLimit: number;
  creditTerms: string;
  taxId: string;
  applicationId: string | null;
  reviewedAt: string | null;
}

/**
 * Current user's credit application status for the dashboard tracker.
 */
export async function getMyCreditStatus(): Promise<MyCreditStatusInfo> {
  const empty: MyCreditStatusInfo = {
    status: "not_applied",
    creditLimit: 0,
    creditTerms: "Registered",
    taxId: "",
    applicationId: null,
    reviewedAt: null,
  };

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSupabaseConfigured) return empty;

    const supabase = await createServerClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "tax_id, credit_application_status, credit_limit, credit_terms"
      )
      .eq("id", currentUser.user.id)
      .maybeSingle();

    const { data: application } = await supabase
      .from("credit_applications")
      .select("id, status, reviewed_at, created_at")
      .or(
        `user_id.eq.${currentUser.user.id},work_email.eq.${currentUser.user.email || ""}`
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const profileStatus = String(
      profile?.credit_application_status || ""
    ).toLowerCase();
    const appStatus = application
      ? normalizeStatus(application.status)
      : null;

    let status: MyCreditStatus = "not_applied";
    if (application) {
      status =
        appStatus === "approved"
          ? "approved"
          : appStatus === "rejected"
            ? "rejected"
            : "pending";
    } else if (profileStatus === "approved") {
      status = "approved";
    } else if (profileStatus === "rejected") {
      status = "rejected";
    } else if (profileStatus === "pending") {
      status = "pending";
    }

    return {
      status,
      creditLimit: Number(profile?.credit_limit || 0),
      creditTerms: String(profile?.credit_terms || "Registered"),
      taxId: String(profile?.tax_id || currentUser.profile.taxId || ""),
      applicationId: application?.id ? String(application.id) : null,
      reviewedAt: application?.reviewed_at
        ? String(application.reviewed_at)
        : null,
    };
  } catch (err) {
    console.warn("getMyCreditStatus exception:", err);
    return empty;
  }
}
