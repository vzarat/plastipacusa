"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export interface UserProfile {
  id: string;
  email?: string;
  fullName: string;
  companyName: string;
  role: "client" | "admin" | "specialist";
  createdAt?: string;
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
 * Register a new commercial client account with company name & full name.
 */
export async function signUp({
  email,
  password,
  fullName,
  companyName,
}: {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
}) {
  try {
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

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          company_name: companyName.trim(),
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

        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          role: initialRole,
          email: normalizedEmail,
        });
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
    const cookieStore = await cookies();
    const token = cookieStore.get(ACCESS_COOKIE)?.value;

    if (!token) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Explicitly query id, email, full_name, role, company_name from public.profiles
    let profileData: any = null;
    try {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, company_name")
        .eq("id", user.id)
        .single();
      if (!profileErr && profile) {
        profileData = profile;
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

    const emailLower = user.email?.toLowerCase() || "";
    const isEmailAdmin =
      emailLower.startsWith("admin@") ||
      emailLower.includes("admin@plastipacusa");

    // Do NOT default or force role = 'client' if profile?.role === 'admin'
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
        email: user.email,
        fullName,
        companyName,
        role: resolvedRole,
        createdAt: user.created_at,
      },
    };
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

