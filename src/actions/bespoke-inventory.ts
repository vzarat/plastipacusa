"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import {
  BESPOKE_CATEGORIES,
  BESPOKE_WAREHOUSE_CODE,
  derivePalletCount,
  mapBespokeInventoryItem,
  normalizeUomForCategory,
  type BespokeCategory,
  type BespokeInventoryItem,
} from "@/lib/bespoke-inventory";
import {
  matchKeyForImportRow,
  type BespokeImportRow,
} from "@/lib/bespoke-excel-import";
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

  const category = asCategory(input.category);
  const payload = {
    warehouse_code: warehouseCode,
    item_name: itemName,
    category,
    client_name: String(input.clientName || "").trim(),
    client_part_number: String(input.clientPartNumber || "").trim(),
    unit_of_measure: normalizeUomForCategory(category, input.unitOfMeasure),
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

export type BespokeImportBatch = {
  id: string;
  warehouseCode: string;
  countedDate: string;
  fileName: string;
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  notes: string;
  createdAt: string;
};

export async function listBespokeImportBatches(
  warehouseCode: string = BESPOKE_WAREHOUSE_CODE
): Promise<BespokeImportBatch[]> {
  const staff = await requireWarehouseStaff();
  if (!staff) return [];

  const client = await db();
  const { data, error } = await client
    .from("inventory_import_batches")
    .select("*")
    .eq("warehouse_code", warehouseCode)
    .order("counted_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    // Table may not exist until migration is applied.
    console.warn("[bespoke] listBespokeImportBatches:", error.message);
    return [];
  }

  return (data || []).map((row) => ({
    id: String(row.id),
    warehouseCode: String(row.warehouse_code || BESPOKE_WAREHOUSE_CODE),
    countedDate: String(row.counted_date || "").slice(0, 10),
    fileName: String(row.file_name || ""),
    rowCount: num(row.row_count),
    createdCount: num(row.created_count),
    updatedCount: num(row.updated_count),
    notes: String(row.notes || ""),
    createdAt: String(row.created_at || ""),
  }));
}

export type ImportBespokeInventoryInput = {
  rows: BespokeImportRow[];
  countedDate: string;
  fileName?: string;
  warehouseCode?: string;
};

/**
 * Import Excel/CSV rows as a dated count snapshot:
 * upsert master lines, set cant física, log + inventory_counts under one batch.
 */
export async function importBespokeInventoryFromRows(
  input: ImportBespokeInventoryInput
): Promise<{
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
  batchId?: string;
}> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { ok: false, error: "No autorizado." };

  const rows = Array.isArray(input.rows) ? input.rows : [];
  if (!rows.length) return { ok: false, error: "No hay filas para importar." };

  const countedDate = String(input.countedDate || todayIsoDate()).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(countedDate)) {
    return { ok: false, error: "Fecha de conteo inválida." };
  }

  const warehouseCode =
    String(input.warehouseCode || BESPOKE_WAREHOUSE_CODE).trim() ||
    BESPOKE_WAREHOUSE_CODE;
  const fileName = String(input.fileName || "import.xlsx").trim();

  const client = await db();

  const { data: existingRows, error: loadError } = await client
    .from("warehouse_inventory_items")
    .select("*")
    .eq("warehouse_code", warehouseCode);

  if (loadError) {
    return { ok: false, error: loadError.message };
  }

  const byKey = new Map<string, Record<string, unknown>>();
  for (const row of existingRows || []) {
    const mapped = mapBespokeInventoryItem(row as Record<string, unknown>);
    byKey.set(
      matchKeyForImportRow({
        itemName: mapped.itemName,
        clientName: mapped.clientName,
        clientPartNumber: mapped.clientPartNumber,
      }),
      row as Record<string, unknown>
    );
  }

  const { data: batch, error: batchError } = await client
    .from("inventory_import_batches")
    .insert({
      warehouse_code: warehouseCode,
      counted_date: countedDate,
      file_name: fileName,
      row_count: rows.length,
      created_count: 0,
      updated_count: 0,
      notes: `Import ${fileName}`,
      imported_by: staff.user.id,
    })
    .select("*")
    .maybeSingle();

  if (batchError || !batch) {
    return {
      ok: false,
      error:
        batchError?.message ||
        "No se pudo crear el lote de importación. Aplica la migración de imports en Supabase.",
    };
  }

  const batchId = String(batch.id);
  let created = 0;
  let updated = 0;
  const failures: string[] = [];

  for (const row of rows) {
    const itemName = String(row.itemName || "").trim();
    if (!itemName) continue;

    const category = asCategory(row.category);
    const key = matchKeyForImportRow(row);
    const existing = byKey.get(key);
    const physicalQty = num(row.physicalQty);
    const unitsPerPalletOrPack = num(row.unitsPerPalletOrPack);
    const palletCount =
      num(row.palletCount) ||
      derivePalletCount(physicalQty, unitsPerPalletOrPack);
    const payload = {
      warehouse_code: warehouseCode,
      item_name: itemName,
      category,
      client_name: String(row.clientName || "").trim(),
      client_part_number: String(row.clientPartNumber || "").trim(),
      unit_of_measure: normalizeUomForCategory(category, row.unitOfMeasure),
      units_per_pallet_or_pack: unitsPerPalletOrPack,
      min_inventory: num(row.minInventory),
      physical_qty: physicalQty,
      pallet_count: palletCount,
      is_obsolete: Boolean(row.isObsolete),
      count_notes: String(row.countNotes || "").trim(),
      counted_date: countedDate,
      updated_at: new Date().toISOString(),
    };

    try {
      let saved: Record<string, unknown> | null = null;
      let oldQty = 0;
      let oldPallets = 0;

      if (existing?.id) {
        oldQty = num(existing.physical_qty);
        oldPallets = num(existing.pallet_count);
        const { data, error } = await client
          .from("warehouse_inventory_items")
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .maybeSingle();
        if (error || !data) {
          failures.push(`${itemName}: ${error?.message || "update failed"}`);
          continue;
        }
        saved = data as Record<string, unknown>;
        updated += 1;
      } else {
        const { data, error } = await client
          .from("warehouse_inventory_items")
          .insert(payload)
          .select("*")
          .maybeSingle();
        if (error || !data) {
          failures.push(`${itemName}: ${error?.message || "insert failed"}`);
          continue;
        }
        saved = data as Record<string, unknown>;
        created += 1;
        byKey.set(key, saved);
      }

      const itemId = String(saved.id);
      await client.from("inventory_logs").insert({
        item_id: itemId,
        warehouse_code: warehouseCode,
        user_id: staff.user.id,
        action: existing?.id ? "count_update" : "created",
        field_changed: "physical_qty",
        old_physical_qty: oldQty,
        new_physical_qty: physicalQty,
        old_pallet_count: oldPallets,
        new_pallet_count: palletCount,
        notes: `Import Excel ${fileName} · ${countedDate}`,
      });

      await client.from("inventory_counts").insert({
        item_id: itemId,
        warehouse_code: warehouseCode,
        item_name: itemName,
        category,
        client_name: payload.client_name,
        client_part_number: payload.client_part_number,
        unit_of_measure: payload.unit_of_measure,
        physical_qty: physicalQty,
        pallet_count: palletCount,
        count_notes: payload.count_notes,
        counted_date: countedDate,
        counted_by: staff.user.id,
        import_batch_id: batchId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${itemName}: ${message}`);
    }
  }

  await client
    .from("inventory_import_batches")
    .update({
      created_count: created,
      updated_count: updated,
      row_count: created + updated,
      notes:
        failures.length > 0
          ? `Import con ${failures.length} error(es): ${failures.slice(0, 3).join("; ")}`
          : `Import OK · ${fileName}`,
    })
    .eq("id", batchId);

  revalidateBespoke();

  if (created + updated === 0) {
    return {
      ok: false,
      error: failures[0] || "No se guardó ninguna fila.",
      created,
      updated,
      batchId,
    };
  }

  return { ok: true, created, updated, batchId };
}
