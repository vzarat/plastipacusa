"use server";

import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ApplyDiscountResult, DiscountCode } from "@/types/discount";
import {
  normalizeDiscountRpcPayload,
  validateDiscountRow,
} from "@/lib/discounts";

/**
 * Validate a discount code against Supabase `public.discount_codes`.
 * Prefers RPC `apply_discount_code`, then falls back to a direct table query
 * for active rows.
 */
export async function applyDiscountCode(code: string): Promise<ApplyDiscountResult> {
  const trimmed = String(code || "").trim().toUpperCase();
  if (!trimmed) {
    return { success: false, error: "Please enter a discount code." };
  }

  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: "Discount codes are unavailable. Supabase is not configured.",
    };
  }

  try {
    const supabase = await createServerClient();

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "apply_discount_code",
      { p_code: trimmed }
    );

    if (!rpcError && rpcData) {
      return normalizeDiscountRpcPayload(rpcData);
    }

    // Direct table lookup: active promo codes only
    const { data: rows, error: queryError } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("is_active", true);

    if (queryError) {
      console.error("discount_codes query failed:", queryError.message);
      return {
        success: false,
        error: "Unable to validate discount code. Please try again.",
      };
    }

    const match = (rows || []).find(
      (row) => String(row.code || "").toUpperCase() === trimmed
    ) as DiscountCode | undefined;

    if (!match) {
      return { success: false, error: "Discount code not found." };
    }

    return validateDiscountRow(match, trimmed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("applyDiscountCode failed:", message);
    return {
      success: false,
      error: "Unable to validate discount code. Please try again.",
    };
  }
}
