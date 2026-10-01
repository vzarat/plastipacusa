"use server";

import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  mapShippingAddressRow,
  validateShippingAddressInput,
  type SavedShippingAddress,
  type ShippingAddressInput,
  type ShippingAddressRow,
} from "@/lib/saved-shipping-address";

export interface ShippingAddressResult {
  success: boolean;
  address?: SavedShippingAddress;
  addresses?: SavedShippingAddress[];
  error?: string;
}

type AddressClient = Awaited<ReturnType<typeof createServerClient>>;

async function requireUserId(): Promise<
  | { ok: false; error: string }
  | { ok: true; supabase: AddressClient; userId: string }
> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "Saved addresses are temporarily unavailable." };
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return { ok: false, error: "Sign in to manage shipping addresses." };
  }

  return { ok: true, supabase, userId: user.id };
}

function isMissingTable(message: string) {
  return /shipping_addresses/i.test(message) && /does not exist|schema cache|could not find/i.test(message);
}

export async function listShippingAddresses(): Promise<ShippingAddressResult> {
  const auth = await requireUserId();
  if (!auth.ok) return { success: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("shipping_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return {
      success: false,
      error: isMissingTable(error.message)
        ? "The shipping address book is not set up yet."
        : error.message,
    };
  }

  return {
    success: true,
    addresses: ((data || []) as ShippingAddressRow[]).map(mapShippingAddressRow),
  };
}

async function clearDefault(userId: string, supabase: AddressClient) {
  await supabase
    .from("shipping_addresses")
    .update({ is_default: false })
    .eq("user_id", userId)
    .eq("is_default", true);
}

export async function createShippingAddress(
  input: ShippingAddressInput
): Promise<ShippingAddressResult> {
  const validationError = validateShippingAddressInput(input);
  if (validationError) return { success: false, error: validationError };

  const auth = await requireUserId();
  if (!auth.ok) return { success: false, error: auth.error };
  const { supabase, userId } = auth;

  const { count } = await supabase
    .from("shipping_addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const makeDefault = Boolean(input.isDefault) || (count ?? 0) === 0;
  if (makeDefault) {
    await clearDefault(userId, supabase);
  }

  const { data, error } = await supabase
    .from("shipping_addresses")
    .insert({
      user_id: userId,
      full_name: input.fullName.trim(),
      company_name: input.companyName?.trim() || null,
      street_address: input.streetAddress.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      postal_code: input.postalCode.trim(),
      phone: input.phone.trim(),
      is_default: makeDefault,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error
        ? isMissingTable(error.message)
          ? "The shipping address book is not set up yet."
          : error.message
        : "Could not save this address.",
    };
  }

  return {
    success: true,
    address: mapShippingAddressRow(data as ShippingAddressRow),
  };
}

export async function deleteShippingAddress(id: string): Promise<ShippingAddressResult> {
  if (!id) return { success: false, error: "Address not found." };

  const auth = await requireUserId();
  if (!auth.ok) return { success: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: existing } = await supabase
    .from("shipping_addresses")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) return { success: false, error: "Address not found." };

  const { error } = await supabase
    .from("shipping_addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  if (existing.is_default) {
    const { data: next } = await supabase
      .from("shipping_addresses")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (next?.id) {
      await supabase
        .from("shipping_addresses")
        .update({ is_default: true })
        .eq("id", next.id)
        .eq("user_id", userId);
    }
  }

  return listShippingAddresses();
}

export async function setDefaultShippingAddress(
  id: string
): Promise<ShippingAddressResult> {
  if (!id) return { success: false, error: "Address not found." };

  const auth = await requireUserId();
  if (!auth.ok) return { success: false, error: auth.error };
  const { supabase, userId } = auth;

  await clearDefault(userId, supabase);

  const { data, error } = await supabase
    .from("shipping_addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: error?.message || "Could not update the default address." };
  }

  const listed = await listShippingAddresses();
  return {
    success: true,
    address: mapShippingAddressRow(data as ShippingAddressRow),
    addresses: listed.addresses,
  };
}
