"use server";

import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ApplyCouponResult } from "@/types/coupon";
import { mapCouponToApplied, normalizeRpcCouponPayload } from "@/lib/coupons";

/**
 * Validate a promo code via Supabase RPC `apply_coupon`.
 * Falls back to a direct coupons table lookup when RPC is unavailable.
 */
export async function applyCouponCode(
  code: string,
  userEmail?: string | null
): Promise<ApplyCouponResult> {
  const trimmed = String(code || "").trim().toUpperCase();
  if (!trimmed) {
    return { success: false, error: "Please enter a promo code." };
  }

  if (!isSupabaseConfigured) {
    return { success: false, error: "Promo service is temporarily unavailable." };
  }

  try {
    const supabase = await createServerClient();
    const email = userEmail ? String(userEmail).trim().toLowerCase() : null;

    const { data, error } = await supabase.rpc("apply_coupon", {
      p_code: trimmed,
      p_user_email: email,
    });

    if (!error && data) {
      return normalizeRpcCouponPayload(data);
    }

    // Fallback: direct table read (requires select policy on active coupons)
    const { data: row, error: queryError } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", trimmed)
      .maybeSingle();

    if (queryError || !row) {
      return {
        success: false,
        error:
          error?.message ||
          queryError?.message ||
          "Promo code not found.",
      };
    }

    if (!row.is_active) {
      return { success: false, error: "This promo code is inactive." };
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return { success: false, error: "This promo code has expired." };
    }
    if (
      row.max_uses !== null &&
      row.max_uses !== undefined &&
      Number(row.used_count || 0) >= Number(row.max_uses)
    ) {
      return {
        success: false,
        error: "This promo code has reached its usage limit.",
      };
    }
    if (row.bound_email) {
      const bound = String(row.bound_email).trim().toLowerCase();
      if (!email || bound !== email) {
        return {
          success: false,
          error: "This promo code is locked to a specific customer email.",
        };
      }
    }

    return { success: true, coupon: mapCouponToApplied(row) };
  } catch (err: any) {
    console.error("applyCouponCode failed:", err?.message || err);
    return { success: false, error: "Unable to validate promo code right now." };
  }
}
