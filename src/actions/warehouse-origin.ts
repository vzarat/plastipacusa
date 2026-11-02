"use server";

import { getCurrentUser } from "@/actions/auth";
import {
  DEFAULT_WAREHOUSE_ORIGIN,
  ensureWarehouseOriginLoaded,
  setWarehouseOriginCache,
  validateWarehouseOriginForSave,
  type WarehouseOriginAddress,
} from "@/lib/shipping/warehouse-origin";
import {
  fetchWarehouseOrigin,
  upsertWarehouseOrigin,
} from "@/lib/shipping/warehouse-origin-store";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function loadWarehouseOriginForAdmin(): Promise<{
  origin: WarehouseOriginAddress;
}> {
  await requireAdmin();
  const origin = await fetchWarehouseOrigin();
  setWarehouseOriginCache(origin);
  return { origin };
}

export async function saveWarehouseOrigin(
  input: Partial<WarehouseOriginAddress>
): Promise<{ success: true; origin: WarehouseOriginAddress } | { success: false; error: string }> {
  await requireAdmin();
  const validated = validateWarehouseOriginForSave(input);
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }

  const result = await upsertWarehouseOrigin(validated.value);
  if (!result.success) {
    return result;
  }

  return { success: true, origin: validated.value };
}

/** Ensure quote/booking paths use the latest saved origin (or defaults). */
export async function primeWarehouseOriginForShipping(): Promise<WarehouseOriginAddress> {
  return ensureWarehouseOriginLoaded();
}

export { DEFAULT_WAREHOUSE_ORIGIN };
