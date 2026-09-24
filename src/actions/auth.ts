"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";

export interface UserProfile {
  id: string;
  email?: string;
  fullName: string;
  companyName: string;
  phone?: string;
  avatarUrl?: string;
  role: "client" | "admin" | "specialist";
  hasPassword?: boolean;
  passwordSetupSkipped?: boolean;
  backupPasswordPending?: boolean;
  createdAt?: string;
  /** EIN / FEIN — empty means fiscal profile incomplete */
  taxId?: string;
  /** Explicit sales-tax exemption answer (null/undefined = never collected) */
  isTaxExempt?: boolean | null;
  taxExemptionNumber?: string;
  taxCertificateUrl?: string | null;
  creditApplicationStatus?: "pending" | "approved" | "rejected" | null;
  creditLimit?: number;
  creditTerms?: string;
  /** True when tax_id or tax-exempt answer is missing — show compliance modal */
  needsTaxCompliance?: boolean;
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email?: string;
  };
  profile: UserProfile;
}

const ACCESS_COOKIE = "sb-access-token";
const REFRESH_COOKIE = "sb-refresh-token";

/**
 * Sign in existing user with email and password.
 * Persists session tokens in secure HTTP-only cookies.
 */
export async function signIn({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const supabase = await createServerClient();

    if (!email || !password) {
      return { success: false, error: "Please enter both work email and password." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error || !data.session) {
      return {
        success: false,
        error: error?.message || "Invalid email or password. Please check your credentials.",
      };
    }

    const cookieStore = await cookies();
    cookieStore.set(ACCESS_COOKIE, data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: data.session.expires_in || 3600 * 24 * 7,
    });

    if (data.session.refresh_token) {
      cookieStore.set(REFRESH_COOKIE, data.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3600 * 24 * 30, // 30 days
      });
    }

    // Fetch user role from public.profiles or user metadata
    let userRole: "client" | "admin" | "specialist" = "client";

    if (data.user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile?.role) {
          userRole = profile.role as "client" | "admin" | "specialist";
        } else if (data.user.user_metadata?.role) {
          userRole = data.user.user_metadata.role as "client" | "admin" | "specialist";
        }
      } catch (error) {
        if (data.user.user_metadata?.role) {
          userRole = data.user.user_metadata.role as "client" | "admin" | "specialist";
        }
      }

      // Consistent admin fallback if user email is designated admin
      const emailLower = data.user.email?.toLowerCase() || "";
      if (
        userRole === "client" &&
        (emailLower.startsWith("admin@") || emailLower.includes("admin@plastipacusa"))
      ) {
        userRole = "admin";
      }
    }

    return {
      success: true,
      role: userRole,
      redirectUrl: userRole === "admin" ? "/admin" : "/dashboard",
    };
  } catch (err: any) {
    console.error("signIn error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during sign in.",
    };
  }
}

/**
 * Register a new customer account with company name & full name.
 * Optional B2B tax fields persist to profiles / company_profiles.
 */
export async function signUp({
  email,
  password,
  fullName,
  companyName,
  phone,
  taxId,
  isTaxExempt,
  taxExemptionNumber,
}: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  phone?: string;
  taxId?: string;
  isTaxExempt?: boolean;
  taxExemptionNumber?: string;
}) {
  try {
    const supabase = await createServerClient();

    if (!email || !password || !fullName || !companyName) {
      return {
        success: false,
        error: "All fields are required (Company Name, Full Name, Work Email, and Password).",
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters long.",
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedTaxId = (taxId || "").trim();
    const trimmedPhone = (phone || "").trim();
    const trimmedExemptNo = (taxExemptionNumber || "").trim();
    const taxExempt = Boolean(isTaxExempt);

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          phone: trimmedPhone || undefined,
          tax_id: trimmedTaxId || undefined,
          is_tax_exempt: taxExempt,
          role: "client",
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Attempt to upsert into public.profiles if table exists
    if (data.user) {
      try {
        const initialRole =
          normalizedEmail.startsWith("admin@") || normalizedEmail.includes("admin@plastipacusa")
            ? "admin"
            : "client";

        const profilePayload = {
          id: data.user.id,
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          role: initialRole,
          email: normalizedEmail,
          phone: trimmedPhone || null,
          tax_id: trimmedTaxId || null,
          is_tax_exempt: taxExempt,
          tax_exemption_number: trimmedExemptNo || null,
          credit_application_status: "pending" as const,
          has_password: true,
          password_setup_skipped: false,
        };

        await supabase.from("profiles").upsert(profilePayload);

        try {
          await supabase.from("company_profiles").upsert(
            {
              user_id: data.user.id,
              company_name: companyName.trim(),
              tax_id: trimmedTaxId || null,
              is_tax_exempt: taxExempt,
              tax_exemption_number: trimmedExemptNo || null,
              credit_application_status: "pending",
            },
            { onConflict: "user_id" }
          );
        } catch (companyErr) {
          console.warn("Notice: company_profiles upsert skipped:", companyErr);
        }
      } catch (profileErr) {
        console.warn("Notice: public.profiles table upsert skipped:", profileErr);
      }
    }

    // If session is immediately returned (auto-confirm enabled)
    if (data.session) {
      const cookieStore = await cookies();
      cookieStore.set(ACCESS_COOKIE, data.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: data.session.expires_in || 3600 * 24 * 7,
      });

      if (data.session.refresh_token) {
        cookieStore.set(REFRESH_COOKIE, data.session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 3600 * 24 * 30,
        });
      }
    }

    return {
      success: true,
      hasSession: Boolean(data.session),
      message: data.session
        ? "Account created successfully!"
        : "Account created! Please check your email inbox to verify your account before logging in.",
    };
  } catch (err: any) {
    console.error("signUp error:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during account creation.",
    };
  }
}

/**
 * Sign out current user, clear session cookies, and redirect to /login.
 */
export async function signOut() {
  try {
    const supabase = await createServerClient();
    const cookieStore = await cookies();
    cookieStore.delete(ACCESS_COOKIE);
    cookieStore.delete(REFRESH_COOKIE);

    await supabase.auth.signOut();
  } catch (err) {
    console.error("signOut error:", err);
  }

  redirect("/login");
}

/**
 * Retrieve current user and profile data from cookies & Supabase.
 */
export async function getCurrentUser(): Promise<CurrentUserResponse | null> {
  try {
    const supabaseServer = await createServerClient();

    const {
      data: { user },
      error,
    } = await supabaseServer.auth.getUser();

    if (error || !user) {
      return null;
    }

    let profileData: any = null;

    try {
      const { data: profile, error: profileErr } = await supabaseServer
        .from("profiles")
        .select(
          "id, email, full_name, role, company_name, has_password, password_setup_skipped, phone, avatar_url, tax_id, is_tax_exempt, tax_exemption_number, tax_certificate_url, credit_application_status, credit_limit, credit_terms"
        )
        .eq("id", user.id)
        .single();

      if (!profileErr && profile) {
        profileData = profile;
      } else if (profileErr) {
        // Fallback if B2B tax columns are not migrated yet
        const { data: basicProfile } = await supabaseServer
          .from("profiles")
          .select(
            "id, email, full_name, role, company_name, has_password, password_setup_skipped, phone, avatar_url"
          )
          .eq("id", user.id)
          .single();
        if (basicProfile) profileData = basicProfile;
      }
    } catch {
      // Ignore if profiles table does not exist or fails
    }

    const fullName =
      profileData?.full_name ||
      profileData?.fullName ||
      user.user_metadata?.full_name ||
      user.user_metadata?.fullName ||
      user.email?.split("@")[0] ||
      "Valued Client";

    const companyName =
      profileData?.company_name ||
      profileData?.companyName ||
      user.user_metadata?.company_name ||
      user.user_metadata?.companyName ||
      "Industrial Partner";

    const phone = profileData?.phone || user.user_metadata?.phone || "";
    const avatarUrl = profileData?.avatar_url || user.user_metadata?.avatar_url || "";
    const taxId = String(
      profileData?.tax_id || user.user_metadata?.tax_id || ""
    ).trim();

    // Distinguish "never answered" (null / undefined column) from false
    let isTaxExempt: boolean | null = null;
    if (typeof profileData?.is_tax_exempt === "boolean") {
      // Only treat as answered when tax_id is also present (defaults to false otherwise)
      isTaxExempt = taxId ? Boolean(profileData.is_tax_exempt) : null;
    } else if (typeof user.user_metadata?.is_tax_exempt === "boolean" && taxId) {
      isTaxExempt = Boolean(user.user_metadata.is_tax_exempt);
    }

    const taxExemptionNumber = String(
      profileData?.tax_exemption_number ||
        user.user_metadata?.tax_exemption_number ||
        ""
    ).trim();
    const taxCertificateUrl =
      (profileData?.tax_certificate_url as string | null) ||
      (user.user_metadata?.tax_certificate_url as string | null) ||
      null;

    const needsTaxCompliance = !taxId || isTaxExempt === null;

    const creditApplicationStatusRaw = String(
      profileData?.credit_application_status || ""
    ).toLowerCase();
    const creditApplicationStatus =
      creditApplicationStatusRaw === "approved" ||
      creditApplicationStatusRaw === "rejected" ||
      creditApplicationStatusRaw === "pending"
        ? (creditApplicationStatusRaw as "pending" | "approved" | "rejected")
        : null;
    const creditLimit = Number(profileData?.credit_limit || 0);
    const creditTerms = String(profileData?.credit_terms || "Registered");

    const emailLower = user.email?.toLowerCase() || "";
    const hasPassword = Boolean(
      profileData?.has_password ?? user.user_metadata?.has_password ?? false
    );
    const passwordSetupSkipped = Boolean(
      profileData?.password_setup_skipped ?? user.user_metadata?.password_setup_skipped ?? false
    );
    const backupPasswordPending = Boolean(
      user.user_metadata?.backup_password_pending ?? false
    );

    const isEmailAdmin =
      emailLower.startsWith("admin@") ||
      emailLower.includes("admin@plastipacusa");

    let resolvedRole: "client" | "admin" | "specialist" = "client";

    if (profileData?.role) {
      resolvedRole = profileData.role as "client" | "admin" | "specialist";
    } else if (user.user_metadata?.role) {
      resolvedRole = user.user_metadata.role as "client" | "admin" | "specialist";
    } else if (isEmailAdmin) {
      resolvedRole = "admin";
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        id: user.id,
        email: profileData?.email || user.email,
        fullName,
        companyName,
        phone,
        avatarUrl,
        role: resolvedRole,
        hasPassword,
        passwordSetupSkipped,
        backupPasswordPending,
        createdAt: user.created_at,
        taxId,
        isTaxExempt,
        taxExemptionNumber,
        taxCertificateUrl,
        creditApplicationStatus,
        creditLimit,
        creditTerms,
        needsTaxCompliance,
      },
    };
  } catch {
    return null;
  }
}

