"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import {
  BESPOKE_CATEGORIES,
  BESPOKE_UOMS,
  BESPOKE_WAREHOUSE_CODE,
  derivePalletCount,
  mapBespokeInventoryItem,
  type BespokeCategory,
  type BespokeInventoryItem,
  type BespokeUom,
} from "@/lib/bespoke-inventory";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

async function requireWarehouseStaff() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  const role = currentUser.profile.role;
  if (role !== "admin" && role !== "warehouse_supervisor") return null;
  return currentUser;
}

async function db() {
  if (isServiceRoleConfigured()) return createServiceRoleClient();
  return createServerClient();
}

function revalidateBespoke() {
  revalidatePath("/admin/inventory/usa");
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function asCategory(value: unknown): BespokeCategory {
  const raw = String(value || "");
  return (BESPOKE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as BespokeCategory)
    : "other";
}

function asUom(value: unknown): BespokeUom {
  const raw = String(value || "").toUpperCase();
  return (BESPOKE_UOMS as readonly string[]).includes(raw)
    ? (raw as BespokeUom)
    : "PZA";
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listBespokeInventoryItems(
  warehouseCode: string = BESPOKE_WAREHOUSE_CODE
): Promise<BespokeInventoryItem[]> {
  const staff = await requireWarehouseStaff();
  if (!staff) return [];

  const client = await db();
  const { data, error } = await client
    .from("warehouse_inventory_items")
    .select("*")
    .eq("warehouse_code", warehouseCode)
    .order("sort_order", { ascending: true })
    .order("item_name", { ascending: true });

  if (error) {
    console.error("[bespoke] listBespokeInventoryItems:", error.message);
    return [];
  }

  return (data || []).map((row) =>
    mapBespokeInventoryItem(row as Record<string, unknown>)
  );
}

export type UpsertBespokeItemInput = {
  id?: string;
  warehouseCode?: string;
  itemName: string;
  category?: string;
  clientName?: string;
  clientPartNumber?: string;
  unitOfMeasure?: string;
  unitsPerPalletOrPack?: number;
  minInventory?: number;
  isObsolete?: boolean;
  sortOrder?: number;
};

export async function upsertBespokeInventoryItem(
  input: UpsertBespokeItemInput
): Promise<{ ok: boolean; error?: string; item?: BespokeInventoryItem }> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { ok: false, error: "Unauthorized." };

  const itemName = String(input.itemName || "").trim();
  if (!itemName) return { ok: false, error: "Item name is required." };

  const warehouseCode = String(
    input.warehouseCode || BESPOKE_WAREHOUSE_CODE
  ).trim() || BESPOKE_WAREHOUSE_CODE;

  const payload = {
    warehouse_code: warehouseCode,
    item_name: itemName,
    category: asCategory(input.category),
    client_name: String(input.clientName || "").trim(),
    client_part_number: String(input.clientPartNumber || "").trim(),
    unit_of_measure: asUom(input.unitOfMeasure),
    units_per_pallet_or_pack: num(input.unitsPerPalletOrPack),
    min_inventory: num(input.minInventory),
    is_obsolete: Boolean(input.isObsolete),
    sort_order: Math.floor(num(input.sortOrder)),
    updated_at: new Date().toISOString(),
  };

  const client = await db();
  const isUpdate = Boolean(input.id);

  const query = isUpdate
    ? client
        .from("warehouse_inventory_items")
        .update(payload)
        .eq("id", input.id!)
        .select("*")
        .maybeSingle()
    : client
        .from("warehouse_inventory_items")
        .insert({
          ...payload,
          physical_qty: 0,
          pallet_count: 0,
          count_notes: "",
          counted_date: null,
        })
        .select("*")
        .maybeSingle();

  const { data, error } = await query;
  if (error || !data) {
    console.error("[bespoke] upsertBespokeInventoryItem:", error?.message);
    return { ok: false, error: error?.message || "Save failed." };
  }

  await client.from("inventory_logs").insert({
    item_id: data.id,
    warehouse_code: warehouseCode,
    user_id: staff.user.id,
    action: isUpdate ? "updated" : "created",
    field_changed: "meta",
    notes: isUpdate ? "Item master updated" : "Item created",
  });

  revalidateBespoke();
  return {
    ok: true,
    item: mapBespokeInventoryItem(data as Record<string, unknown>),
  };
}

export type UpdateBespokeCountInput = {
  itemId: string;
  physicalQty: number;
  palletCount?: number;
  countNotes?: string;
  countedDate?: string | null;
};

async function writeCountAndLog(opts: {
  staffUserId: string;
  existing: Record<string, unknown>;
  physicalQty: number;
  palletCount: number;
  countNotes: string;
  countedDate: string | null;
  action: "count_update" | "updated";
  fieldChanged: string;
  notes: string;
}): Promise<{ ok: boolean; error?: string; item?: BespokeInventoryItem }> {
  const itemId = String(opts.existing.id || "");
  const oldQty = num(opts.existing.physical_qty);
  const oldPallets = num(opts.existing.pallet_count);
  const warehouseCode = String(
    opts.existing.warehouse_code || BESPOKE_WAREHOUSE_CODE
  );

  const client = await db();
  const { data, error } = await client
    .from("warehouse_inventory_items")
    .update({
      physical_qty: opts.physicalQty,
      pallet_count: opts.palletCount,
      count_notes: opts.countNotes,
      counted_date: opts.countedDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    console.error("[bespoke] writeCountAndLog:", error?.message);
    return { ok: false, error: error?.message || "No se pudo guardar." };
  }

  await client.from("inventory_logs").insert({
    item_id: itemId,
    warehouse_code: warehouseCode,
    user_id: opts.staffUserId,
    action: opts.action,
    field_changed: opts.fieldChanged,
    old_physical_qty: oldQty,
    new_physical_qty: opts.physicalQty,
    old_pallet_count: oldPallets,
    new_pallet_count: opts.palletCount,
    notes: opts.notes,
  });

  await client.from("inventory_counts").insert({
    item_id: itemId,
    warehouse_code: warehouseCode,
    item_name: String(opts.existing.item_name || ""),
    category: String(opts.existing.category || "other"),
    client_name: String(opts.existing.client_name || ""),
    client_part_number: String(opts.existing.client_part_number || ""),
    unit_of_measure: String(opts.existing.unit_of_measure || "PZA"),
    physical_qty: opts.physicalQty,
    pallet_count: opts.palletCount,
    count_notes: opts.countNotes,
    counted_date: opts.countedDate,
    counted_by: opts.staffUserId,
  });

  revalidateBespoke();
  return {
    ok: true,
    item: mapBespokeInventoryItem(data as Record<string, unknown>),
  };
}

/** Set absolute physical count (like filling CANT FISICA on the paper sheet). */
export async function updateBespokeInventoryCount(
  input: UpdateBespokeCountInput
): Promise<{ ok: boolean; error?: string; item?: BespokeInventoryItem }> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { ok: false, error: "No autorizado." };

  const itemId = String(input.itemId || "").trim();
  if (!itemId) return { ok: false, error: "Falta el artículo." };

  const physicalQty = num(input.physicalQty);
  const countNotes = String(input.countNotes || "").trim();
  const countedDate =
    input.countedDate === null
      ? null
      : String(input.countedDate || todayIsoDate()).slice(0, 10);

  const client = await db();
  const { data: existing, error: loadError } = await client
    .from("warehouse_inventory_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: loadError?.message || "Artículo no encontrado." };
  }

  const perPack = num(existing.units_per_pallet_or_pack);
  const palletCount =
    input.palletCount != null && Number.isFinite(Number(input.palletCount))
      ? num(input.palletCount)
      : derivePalletCount(physicalQty, perPack);

  return writeCountAndLog({
    staffUserId: staff.user.id,
    existing: existing as Record<string, unknown>,
    physicalQty,
    palletCount,
    countNotes,
    countedDate,
    action: "count_update",
    fieldChanged: "physical_qty",
    notes: countNotes || "Conteo físico",
  });
}

export type BespokeMovementInput = {
  itemId: string;
  /** Entrada = product received; salida = product shipped/used. */
  direction: "in" | "out";
  quantity: number;
  notes?: string;
};

/** Add (entrada) or remove (salida) units from CANT FISICA. */
export async function adjustBespokeInventoryMovement(
  input: BespokeMovementInput
): Promise<{ ok: boolean; error?: string; item?: BespokeInventoryItem }> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { ok: false, error: "No autorizado." };

  const itemId = String(input.itemId || "").trim();
  const qty = num(input.quantity);
  if (!itemId) return { ok: false, error: "Falta el artículo." };
  if (qty <= 0) return { ok: false, error: "La cantidad debe ser mayor a 0." };

  const client = await db();
  const { data: existing, error: loadError } = await client
    .from("warehouse_inventory_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (loadError || !existing) {
    return { ok: false, error: loadError?.message || "Artículo no encontrado." };
  }

  const oldQty = num(existing.physical_qty);
  const nextQty =
    input.direction === "in" ? oldQty + qty : Math.max(0, oldQty - qty);

  if (input.direction === "out" && qty > oldQty) {
    return {
      ok: false,
      error: `No hay suficiente existencia (${oldQty} en piso).`,
    };
  }

  const perPack = num(existing.units_per_pallet_or_pack);
  const palletCount = derivePalletCount(nextQty, perPack);
  const label = input.direction === "in" ? "ENTRADA" : "SALIDA";
  const notes = [
    `${label} ${qty}`,
    String(input.notes || "").trim(),
  ]
    .filter(Boolean)
    .join(" · ");

  return writeCountAndLog({
    staffUserId: staff.user.id,
    existing: existing as Record<string, unknown>,
    physicalQty: nextQty,
    palletCount,
    countNotes: String(existing.count_notes || ""),
    countedDate: todayIsoDate(),
    action: "count_update",
    fieldChanged: "physical_qty",
    notes,
  });
}

export async function setBespokeItemObsolete(
  itemId: string,
  isObsolete: boolean
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { ok: false, error: "Unauthorized." };

  const client = await db();
  const { data, error } = await client
    .from("warehouse_inventory_items")
    .update({
      is_obsolete: Boolean(isObsolete),
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("id, warehouse_code")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message || "Update failed." };
  }

  await client.from("inventory_logs").insert({
    item_id: itemId,
    warehouse_code: String(data.warehouse_code || BESPOKE_WAREHOUSE_CODE),
    user_id: staff.user.id,
    action: "obsolete_toggle",
    field_changed: "is_obsolete",
    notes: isObsolete ? "Marked OBSOLETO" : "Cleared OBSOLETO",
  });

  revalidateBespoke();
  return { ok: true };
}

export async function deleteBespokeInventoryItem(
  itemId: string
): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { ok: false, error: "Unauthorized." };
  if (staff.profile.role !== "admin") {
    return { ok: false, error: "Only admins can delete items." };
  }

  const client = await db();
  const { data: existing } = await client
    .from("warehouse_inventory_items")
    .select("id, warehouse_code, item_name, physical_qty, pallet_count")
    .eq("id", itemId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Item not found." };

  await client.from("inventory_logs").insert({
    item_id: itemId,
    warehouse_code: String(existing.warehouse_code || BESPOKE_WAREHOUSE_CODE),
    user_id: staff.user.id,
    action: "deleted",
    field_changed: "meta",
    old_physical_qty: num(existing.physical_qty),
    old_pallet_count: num(existing.pallet_count),
    notes: `Deleted: ${existing.item_name || itemId}`,
  });

  const { error } = await client
    .from("warehouse_inventory_items")
    .delete()
    .eq("id", itemId);

  if (error) return { ok: false, error: error.message };

  revalidateBespoke();
  return { ok: true };
}
