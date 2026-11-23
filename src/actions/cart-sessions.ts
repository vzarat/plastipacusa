"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { abandonedCartHours } from "@/lib/cart-sessions/config";
import { mapCartSessionRow } from "@/lib/cart-sessions/map";
import type {
  CartFunnelEventName,
  CartSessionMetrics,
  CartSessionRecord,
  UpsertCartSessionInput,
} from "@/lib/cart-sessions/types";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") return null;
  return currentUser;
}

function adminDb() {
  if (isServiceRoleConfigured()) return createServiceRoleClient();
  return null;
}

function roundMoney(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function upsertCartSession(
  input: UpsertCartSessionInput
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const db = adminDb();
  if (!db) return { success: false, error: "Cart sync unavailable." };

  let userId: string | null = null;
  let profileContact: Partial<UpsertCartSessionInput> = {};
  try {
    const current = await getCurrentUser();
    if (current?.user?.id) {
      userId = current.user.id;
      profileContact = {
        email: current.user.email || current.profile.email || "",
        companyName: current.profile.companyName || "",
        contactName: current.profile.fullName || "",
        phone: current.profile.phone || "",
      };
    }
  } catch {
    // guest path
  }

  const guestKey = String(input.guestKey || "").trim() || null;
  const items = Array.isArray(input.items) ? input.items : [];
  const subtotalUsd = roundMoney(input.subtotalUsd);
  const totalPallets = roundMoney(input.totalPallets);
  const email = String(input.email || profileContact.email || "").trim().toLowerCase();
  const companyName = String(input.companyName || profileContact.companyName || "").trim();
  const contactName = String(input.contactName || profileContact.contactName || "").trim();
  const phone = String(input.phone || profileContact.phone || "").trim();
  const shippingZip = String(input.shippingZip || "").match(/\d{5}/)?.[0] || "";
  const shippingCity = String(input.shippingCity || "").trim();
  const shippingState = String(input.shippingState || "").trim().toUpperCase();

  // Guests only persist once we have contact/ZIP (or an authenticated user).
  if (!userId) {
    const identifiable = Boolean(shippingZip || email || phone || contactName);
    if (!identifiable || !guestKey) {
      return { success: true };
    }
  }

  if (!userId && !guestKey) {
    return { success: false, error: "Missing cart identity." };
  }

  const now = new Date().toISOString();
  const payload = {
    guest_key: guestKey,
    user_id: userId,
    email,
    company_name: companyName,
    contact_name: contactName,
    phone,
    shipping_zip: shippingZip,
    shipping_city: shippingCity,
    shipping_state: shippingState,
    items,
    item_count: items.length,
    subtotal_usd: subtotalUsd,
    total_pallets: totalPallets,
    status: items.length === 0 ? "abandoned" : "active",
    last_activity_at: now,
    abandoned_at: items.length === 0 ? now : null,
    source: input.source || "web",
    updated_at: now,
  };

  try {
    let existingId: string | null = null;
    if (userId) {
      const { data } = await db
        .from("cart_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      existingId = data?.id ? String(data.id) : null;
    }
    if (!existingId && guestKey) {
      const { data } = await db
        .from("cart_sessions")
        .select("id")
        .eq("guest_key", guestKey)
        .eq("status", "active")
        .maybeSingle();
      existingId = data?.id ? String(data.id) : null;
    }

    if (existingId) {
      const { data, error } = await db
        .from("cart_sessions")
        .update(payload)
        .eq("id", existingId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return { success: true, sessionId: data?.id ? String(data.id) : existingId };
    }

    if (items.length === 0) {
      return { success: true };
    }

    const { data, error } = await db
      .from("cart_sessions")
      .insert({ ...payload, created_at: now })
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return { success: true, sessionId: data?.id ? String(data.id) : undefined };
  } catch (error) {
    console.error(
      "[cart-sessions] upsert",
      error instanceof Error ? error.message : error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not sync cart.",
    };
  }
}

export async function recordCartFunnelEvent(input: {
  eventName: CartFunnelEventName;
  guestKey?: string | null;
  cartSessionId?: string | null;
  palletCount?: number;
  cartValueUsd?: number;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean }> {
  const db = adminDb();
  if (!db) return { success: false };

  let userId: string | null = null;
  try {
    const current = await getCurrentUser();
    userId = current?.user?.id || null;
  } catch {
    userId = null;
  }

  try {
    let sessionId = input.cartSessionId || null;
    if (!sessionId && (userId || input.guestKey)) {
      let query = db
        .from("cart_sessions")
        .select("id")
        .eq("status", "active")
        .order("last_activity_at", { ascending: false })
        .limit(1);
      if (userId) query = query.eq("user_id", userId);
      else query = query.eq("guest_key", String(input.guestKey));
      const { data } = await query.maybeSingle();
      sessionId = data?.id ? String(data.id) : null;
    }

    await db.from("cart_funnel_events").insert({
      cart_session_id: sessionId,
      guest_key: input.guestKey || null,
      user_id: userId,
      event_name: input.eventName,
      pallet_count: roundMoney(input.palletCount || 0),
      cart_value_usd: roundMoney(input.cartValueUsd || 0),
      metadata: input.metadata || {},
    });

    if (sessionId && input.eventName === "checkout_started") {
      await db
        .from("cart_sessions")
        .update({ checkout_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", sessionId)
        .is("checkout_started_at", null);
    }
    if (sessionId && input.eventName === "credit_auth_prompted") {
      await db
        .from("cart_sessions")
        .update({
          credit_auth_prompted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .is("credit_auth_prompted_at", null);
    }

    return { success: true };
  } catch (error) {
    console.warn(
      "[cart-sessions] funnel event",
      error instanceof Error ? error.message : error
    );
    return { success: false };
  }
}

export async function markCartSessionsConverted(input: {
  userId?: string | null;
  guestKey?: string | null;
  email?: string | null;
  orderId: string;
}): Promise<void> {
  const db = adminDb();
  if (!db) return;
  const now = new Date().toISOString();
  const orderId = String(input.orderId || "").trim();
  if (!orderId) return;

  try {
    const filters: Array<Record<string, string>> = [];
    if (input.userId) filters.push({ user_id: String(input.userId) });
    if (input.guestKey) filters.push({ guest_key: String(input.guestKey) });
    if (input.email) filters.push({ email: String(input.email).toLowerCase() });

    if (filters.length === 0) return;

    for (const filter of filters) {
      let query = db
        .from("cart_sessions")
        .update({
          status: "converted",
          converted_at: now,
          converted_order_id: orderId,
          last_activity_at: now,
          updated_at: now,
          abandoned_at: null,
        })
        .in("status", ["active", "abandoned"]);
      const [key, value] = Object.entries(filter)[0];
      query = query.eq(key, value);
      await query;
    }

    await db.from("cart_funnel_events").insert({
      guest_key: input.guestKey || null,
      user_id: input.userId || null,
      event_name: "order_completed",
      metadata: { orderId },
    });
  } catch (error) {
    console.warn(
      "[cart-sessions] mark converted",
      error instanceof Error ? error.message : error
    );
  }
}

export async function markStaleCartsAbandoned(): Promise<{ updated: number }> {
  const db = adminDb();
  if (!db) return { updated: 0 };
  const hours = abandonedCartHours();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  try {
    const { data, error } = await db
      .from("cart_sessions")
      .update({
        status: "abandoned",
        abandoned_at: now,
        updated_at: now,
      })
      .eq("status", "active")
      .lt("last_activity_at", cutoff)
      .gt("item_count", 0)
      .select("id");
    if (error) throw error;
    return { updated: data?.length || 0 };
  } catch (error) {
    console.warn(
      "[cart-sessions] mark abandoned",
      error instanceof Error ? error.message : error
    );
    return { updated: 0 };
  }
}

export async function listAbandonedCartSessions(options?: {
  limit?: number;
  includeActive?: boolean;
}): Promise<{
  carts: CartSessionRecord[];
  metrics: CartSessionMetrics;
}> {
  if (!(await requireAdmin())) {
    return {
      carts: [],
      metrics: {
        abandonedCount: 0,
        abandonedValueUsd: 0,
        abandonedPallets: 0,
        activeCount: 0,
        convertedCount: 0,
        abandonmentRate: 0,
        lookbackHours: 24 * 7,
        abandonAfterHours: abandonedCartHours(),
      },
    };
  }

  await markStaleCartsAbandoned();

  const db = adminDb() || (await createServerClient());
  const limit = Math.min(200, Math.max(1, options?.limit || 100));
  const abandonAfterHours = abandonedCartHours();
  const lookbackHours = 24 * 7;
  const lookbackCutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

  const statuses = options?.includeActive
    ? ["abandoned", "active"]
    : ["abandoned"];

  const { data: rows } = await db
    .from("cart_sessions")
    .select("*")
    .in("status", statuses)
    .gt("item_count", 0)
    .gte("last_activity_at", lookbackCutoff)
    .order("last_activity_at", { ascending: false })
    .limit(limit);

  const carts = (rows || []).map((row) =>
    mapCartSessionRow(row as Record<string, unknown>)
  );

  const { data: metricRows } = await db
    .from("cart_sessions")
    .select("status, subtotal_usd, total_pallets, item_count")
    .gte("last_activity_at", lookbackCutoff)
    .gt("item_count", 0);

  let abandonedCount = 0;
  let abandonedValueUsd = 0;
  let abandonedPallets = 0;
  let activeCount = 0;
  let convertedCount = 0;
  for (const row of metricRows || []) {
    const status = String(row.status || "");
    const value = roundMoney(Number(row.subtotal_usd) || 0);
    const pallets = roundMoney(Number(row.total_pallets) || 0);
    if (status === "abandoned") {
      abandonedCount += 1;
      abandonedValueUsd += value;
      abandonedPallets += pallets;
    } else if (status === "active") {
      activeCount += 1;
    } else if (status === "converted") {
      convertedCount += 1;
    }
  }

  const closed = abandonedCount + convertedCount;
  const abandonmentRate = closed > 0 ? abandonedCount / closed : 0;

  return {
    carts,
    metrics: {
      abandonedCount,
      abandonedValueUsd: roundMoney(abandonedValueUsd),
      abandonedPallets: roundMoney(abandonedPallets),
      activeCount,
      convertedCount,
      abandonmentRate,
      lookbackHours,
      abandonAfterHours,
    },
  };
}

export async function getCartFunnelSummary(lookbackHours = 24 * 7): Promise<{
  addToCart: number;
  checkoutStarted: number;
  creditAuthPrompted: number;
  orderCompleted: number;
  addToPurchaseRate: number;
}> {
  if (!(await requireAdmin())) {
    return {
      addToCart: 0,
      checkoutStarted: 0,
      creditAuthPrompted: 0,
      orderCompleted: 0,
      addToPurchaseRate: 0,
    };
  }
  const db = adminDb() || (await createServerClient());
  const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from("cart_funnel_events")
    .select("event_name")
    .gte("created_at", cutoff);

  let addToCart = 0;
  let checkoutStarted = 0;
  let creditAuthPrompted = 0;
  let orderCompleted = 0;
  for (const row of data || []) {
    const name = String(row.event_name || "");
    if (name === "add_to_cart") addToCart += 1;
    else if (name === "checkout_started") checkoutStarted += 1;
    else if (name === "credit_auth_prompted") creditAuthPrompted += 1;
    else if (name === "order_completed") orderCompleted += 1;
  }

  return {
    addToCart,
    checkoutStarted,
    creditAuthPrompted,
    orderCompleted,
    addToPurchaseRate: addToCart > 0 ? orderCompleted / addToCart : 0,
  };
}

export async function refreshAbandonedCartsAdmin(): Promise<void> {
  if (!(await requireAdmin())) return;
  await markStaleCartsAbandoned();
  revalidatePath("/admin/abandoned-carts");
}
