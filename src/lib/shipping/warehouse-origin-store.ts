import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_WAREHOUSE_ORIGIN,
  registerWarehouseOriginLoader,
  sanitizeWarehouseOrigin,
  setWarehouseOriginCache,
  type WarehouseOriginAddress,
} from "@/lib/shipping/warehouse-origin";

const SINGLETON_ID = "00000000-0000-4000-8000-000000000001";

async function getClient(): Promise<{
  client: SupabaseClient;
  mode: "service_role" | "anon";
}> {
  if (isServiceRoleConfigured()) {
    return { client: createServiceRoleClient(), mode: "service_role" };
  }
  return { client: await createServerClient(), mode: "anon" };
}

function rowToOrigin(row: Record<string, unknown> | null): WarehouseOriginAddress {
  if (!row) return { ...DEFAULT_WAREHOUSE_ORIGIN };
  return sanitizeWarehouseOrigin({
    street: String(row.street ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    zip: String(row.zip ?? ""),
    dockNotes: String(row.dock_notes ?? ""),
  });
}

export async function fetchWarehouseOrigin(): Promise<WarehouseOriginAddress> {
  try {
    const { client } = await getClient();
    const { data, error } = await client
      .from("warehouse_origin")
      .select("street, city, state, zip, dock_notes")
      .eq("id", SINGLETON_ID)
      .maybeSingle();

    if (error) {
      console.warn("[warehouse-origin] load skipped:", error.message || error);
      return { ...DEFAULT_WAREHOUSE_ORIGIN };
    }

    return rowToOrigin(data as Record<string, unknown> | null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[warehouse-origin] load exception:", message);
    return { ...DEFAULT_WAREHOUSE_ORIGIN };
  }
}

export async function upsertWarehouseOrigin(
  origin: WarehouseOriginAddress
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { client } = await getClient();
    const safe = sanitizeWarehouseOrigin(origin);
    const { error } = await client.from("warehouse_origin").upsert(
      {
        id: SINGLETON_ID,
        street: safe.street,
        city: safe.city,
        state: safe.state,
        zip: safe.zip,
        dock_notes: safe.dockNotes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) {
      console.warn("[warehouse-origin] save failed:", error.message || error);
      return {
        success: false,
        error:
          error.message ||
          "Could not save warehouse origin. Run the warehouse_origin migration if the table is missing.",
      };
    }

    setWarehouseOriginCache(safe);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[warehouse-origin] save exception:", message);
    return { success: false, error: message };
  }
}

registerWarehouseOriginLoader(fetchWarehouseOrigin);
