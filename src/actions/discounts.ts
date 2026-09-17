"use server";

import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ApplyDiscountResult, DiscountCode } from "@/types/discount";
import {
  MOCK_DISCOUNT_CODES,
  mapDiscountToApplied,
  normalizeDiscountRpcPayload,
  validateDiscountRow,
} from "@/lib/discounts";

/**
 * Validate a discount code via Supabase RPC / discount_codes table.
 * Falls back to in-memory mock codes when offline.
 */
export async function applyDiscountCode(code: string): Promise<ApplyDiscountResult> {
  const trimmed = String(code || "").trim().toUpperCase();
  if (!trimmed) {
    return { success: false, error: "Please enter a discount code." };
  }

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerClient();

      const { data, error } = await supabase.rpc("apply_discount_code", {
        p_code: trimmed,
      });

      if (!error && data) {
        return normalizeDiscountRpcPayload(data);
      }

      const { data: row, error: queryError } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", trimmed)
        .maybeSingle();

      if (!queryError && row) {
        return validateDiscountRow(row as DiscountCode, trimmed);
      }

      // Also try legacy coupons table (percent-only)
      const { data: couponRow } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", trimmed)
        .maybeSingle();

      if (couponRow) {
        if (!couponRow.is_active) {
          return { success: false, error: "This discount code is inactive." };
        }
        if (
          couponRow.expires_at &&
          new Date(couponRow.expires_at).getTime() < Date.now()
        ) {
          return { success: false, error: "This discount code has expired." };
        }
        return {
          success: true,
          discount: {
            id: String(couponRow.id),
            code: String(couponRow.code).toUpperCase(),
            name: null,
            discountType: "percent",
            discountValue: Number(couponRow.discount_percent) || 0,
          },
        };
      }
    } catch (err: any) {
      console.error("applyDiscountCode failed:", err?.message || err);
    }
  }

  const mock = MOCK_DISCOUNT_CODES.find(
    (c) => c.code.toUpperCase() === trimmed
  );
  if (mock) {
    return validateDiscountRow(mock, trimmed);
  }

  return { success: false, error: "Discount code not found." };
}
