"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { lineStockUnits } from "@/lib/pallet-stock";
import { MANUAL_FILM_MASTER } from "@/lib/manual-film-master";
import { MACHINE_FILM_MASTER } from "@/lib/machine-film-master";
import { HAND_FULL_PALLET_BOXES } from "@/lib/pricing";
import {
  assignStretchSkuForReceive,
  mapWarehouseInventoryRow,
  mapWarehouseRow,
  matchStretchCatalog,
  resolveProductStretchFields,
  scoreStretchReceiveCandidate,
  tarimaBreakdown,
  tarimasToUnits,
  USA_WAREHOUSE_CODE,
  type InventoryAdjustReason,
  type StretchCatalogItem,
  type StretchMeasureInput,
  type WarehouseInventoryRow,
  type WarehouseRecord,
} from "@/lib/warehouse-inventory";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { handFilmBaseSku } from "@/lib/hand-film-sku";
import { machineFilmBaseSku } from "@/lib/machine-film-sku";

export type WarehouseStaffRole = "admin" | "warehouse_supervisor";

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

function revalidateInventory() {
  revalidatePath("/admin/inventory/usa");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function getWarehouseByCode(
  code: string
): Promise<WarehouseRecord | null> {
  const staff = await requireWarehouseStaff();
  if (!staff) return null;
  const client = await db();
  const { data, error } = await client
    .from("warehouses")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[warehouse] getWarehouseByCode:", error.message);
    return null;
  }
  return mapWarehouseRow(data as Record<string, unknown>);
}

/** Ensure every stretch product has a USA warehouse_inventory row (0 if new). */
async function ensureUsaStretchInventorySeeded(
  warehouseId: string,
  catalog: StretchCatalogItem[]
): Promise<void> {
  if (!catalog.length) return;
  const client = await db();
  const rows = catalog.map((item) => ({
    warehouse_id: warehouseId,
    product_id: item.productId,
    stock_boxes: 0,
    stock_pallets: 0,
    reorder_point: Math.max(8, item.boxesPerPallet || 8),
    updated_at: new Date().toISOString(),
  }));
  // Upsert in chunks; ignore conflicts so existing stock is never wiped.
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await client.from("warehouse_inventory").upsert(chunk, {
      onConflict: "warehouse_id,product_id",
      ignoreDuplicates: true,
    });
    if (error) {
      console.warn("[warehouse] seed inventory:", error.message);
      break;
    }
  }
}

export async function listWarehouseInventory(
  warehouseCode: string = USA_WAREHOUSE_CODE
): Promise<WarehouseInventoryRow[]> {
  const staff = await requireWarehouseStaff();
  if (!staff) return [];

  const warehouse = await getWarehouseByCode(warehouseCode);
  if (!warehouse) return [];

  const catalog = await listStretchReceiveCatalog();
  if (warehouse.code === USA_WAREHOUSE_CODE) {
    await ensureUsaStretchInventorySeeded(warehouse.id, catalog);
  }

  const client = await db();
  let { data, error } = await client
    .from("warehouse_inventory")
    .select("*, products ( * )")
    .eq("warehouse_id", warehouse.id)
    .order("updated_at", { ascending: false });

  // Fallback if nested select shape fails on older PostgREST.
  if (error) {
    console.error("[warehouse] listWarehouseInventory:", error.message);
    const plain = await client
      .from("warehouse_inventory")
      .select("*")
      .eq("warehouse_id", warehouse.id);
    data = plain.data;
    error = plain.error;
    if (error) {
      console.error("[warehouse] listWarehouseInventory plain:", error.message);
      return [];
    }
    // Attach products manually
    const productIds = Array.from(
      new Set((data || []).map((row) => String((row as { product_id?: string }).product_id || "")))
    ).filter(Boolean);
    const { data: products } = await client.from("products").select("*").in("id", productIds);
    const byId = new Map(
      (products || []).map((p) => [String((p as { id: string }).id), p as Record<string, unknown>])
    );
    data = (data || []).map((row) => {
      const r = row as Record<string, unknown>;
      return { ...r, products: byId.get(String(r.product_id || "")) || null };
    });
  }

  const mapped = (data || [])
    .map((row) => mapWarehouseInventoryRow(row as Record<string, unknown>))
    .filter((row) => row.isActive !== false);

  // If inventory rows exist but product join missing measures, overlay catalog measures.
  const catalogById = new Map(catalog.map((item) => [item.productId, item]));
  for (const row of mapped) {
    const cat = catalogById.get(row.productId);
    if (!cat) continue;
    if (row.widthInches == null) row.widthInches = cat.widthInches;
    if (row.gauge == null) row.gauge = cat.gauge;
    if (row.lengthFeet == null) row.lengthFeet = cat.lengthFeet;
    if (!row.partNumber) row.partNumber = cat.partNumber;
    if (!row.application) row.application = cat.application;
    if (!row.productName) row.productName = cat.productName;
    if (row.boxesPerPallet == null) row.boxesPerPallet = cat.boxesPerPallet;
  }

  return mapped.sort((a, b) => {
    const app = String(a.application || "").localeCompare(String(b.application || ""));
    if (app !== 0) return app;
    const gauge = (a.gauge || 0) - (b.gauge || 0);
    if (gauge !== 0) return gauge;
    const width = (a.widthInches || 0) - (b.widthInches || 0);
    if (width !== 0) return width;
    return String(a.productName || "").localeCompare(String(b.productName || ""));
  });
}

function mapStretchCatalogRow(raw: Record<string, unknown>): StretchCatalogItem | null {
  if (raw.is_active === false) return null;
  const resolved = resolveProductStretchFields(raw);
  let application = resolved.application;
  let width = resolved.widthInches;
  let gauge = resolved.gauge;
  let length = resolved.lengthFeet;

  // Fill gaps from official master sheets via slug / measures.
  const slug = resolved.productSlug.toLowerCase();
  const manual = MANUAL_FILM_MASTER.find((row) => row.slug === slug) ||
    (width && gauge && length
      ? MANUAL_FILM_MASTER.find(
          (row) =>
            row.widthInches === width &&
            row.gauge === gauge &&
            row.lengthFeet === length
        )
      : null);
  const machine =
    MACHINE_FILM_MASTER.find((row) => row.slug === slug) ||
    (width && gauge && length
      ? MACHINE_FILM_MASTER.find(
          (row) =>
            row.widthInches === width &&
            row.gauge === gauge &&
            row.lengthFeet === length
        )
      : null);

  if (manual) {
    application = application || "hand";
    width = width || manual.widthInches;
    gauge = gauge || manual.gauge;
    length = length || manual.lengthFeet;
  }
  if (machine) {
    application = "machine";
    width = width || machine.widthInches;
    gauge = gauge || machine.gauge;
    length = length || machine.lengthFeet;
  }

  if (!application || !width || !gauge || !length) return null;

  const bpp = Math.floor(Number(raw.boxes_per_pallet ?? raw.boxesPerPallet) || 0);
  const partNumber =
    resolved.partNumber ||
    (application === "machine"
      ? machineFilmBaseSku(width, gauge, length)
      : handFilmBaseSku({
          widthInches: width,
          gauge,
          lengthFeet: length,
          partNumber: resolved.partNumber,
          name: resolved.productName,
          title: resolved.productName,
        }));

  return {
    productId: String(raw.id),
    productName: resolved.productName || `${width}" ${gauge} GA ${length} ft`,
    partNumber,
    application,
    widthInches: Math.round(width),
    gauge: Math.round(gauge),
    lengthFeet: Math.round(length),
    boxesPerPallet:
      bpp > 0
        ? bpp
        : application === "machine"
          ? 40
          : HAND_FULL_PALLET_BOXES,
  };
}

/** Active stretch SKUs with measures — used to assign SKU from floor measures. */
export async function listStretchReceiveCatalog(): Promise<StretchCatalogItem[]> {
  const staff = await requireWarehouseStaff();
  if (!staff) return [];

  const client = await db();
  // Broad select — do not require application=hand|machine in SQL (many rows use type).
  const { data, error } = await client
    .from("products")
    .select("*")
    .limit(800);

  if (error) {
    console.error("[warehouse] listStretchReceiveCatalog:", error.message);
    return [];
  }

  const fromDb = (data || [])
    .map((row) => mapStretchCatalogRow(row as Record<string, unknown>))
    .filter((row): row is StretchCatalogItem => Boolean(row));

  // If DB mapping found nothing usable, try slug lookups against master sheets.
  if (fromDb.length === 0 && (data || []).length > 0) {
    const bySlug = new Map(
      (data || []).map((row) => {
        const r = row as Record<string, unknown>;
        return [String(r.slug || "").toLowerCase(), r];
      })
    );
    for (const master of [...MANUAL_FILM_MASTER, ...MACHINE_FILM_MASTER]) {
      const raw = bySlug.get(master.slug.toLowerCase());
      if (!raw) continue;
      const mapped = mapStretchCatalogRow(raw);
      if (mapped) fromDb.push(mapped);
    }
  }

  // Deduplicate by productId keeping best receive candidate.
  const best = new Map<string, StretchCatalogItem>();
  for (const item of fromDb) {
    const prev = best.get(item.productId);
    if (!prev || scoreStretchReceiveCandidate(item) > scoreStretchReceiveCandidate(prev)) {
      best.set(item.productId, item);
    }
  }

  return [...best.values()].sort((a, b) => {
    const app = a.application.localeCompare(b.application);
    if (app !== 0) return app;
    return (
      (a.widthInches || 0) - (b.widthInches || 0) ||
      (a.gauge || 0) - (b.gauge || 0) ||
      (a.lengthFeet || 0) - (b.lengthFeet || 0) ||
      String(a.partNumber || "").localeCompare(String(b.partNumber || ""))
    );
  });
}

/**
 * Receive full pallets by film measures. System assigns the matching SKU
 * (prefers full-pallet catalog row). Pass productId when multiple SKUs share measures.
 */
export async function receiveStretchByMeasures(input: {
  warehouseCode?: string;
  application: "hand" | "machine";
  widthInches: number;
  gauge: number;
  lengthFeet: number;
  pallets: number;
  productId?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  error?: string;
  sku?: string | null;
  productName?: string;
  productId?: string;
  stockBoxes?: number;
  matches?: StretchCatalogItem[];
}> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { success: false, error: "Unauthorized." };

  const measure: StretchMeasureInput = {
    application: input.application === "machine" ? "machine" : "hand",
    widthInches: Math.round(Number(input.widthInches) || 0),
    gauge: Math.round(Number(input.gauge) || 0),
    lengthFeet: Math.round(Number(input.lengthFeet) || 0),
  };
  const pallets = Math.max(0, Math.floor(Number(input.pallets) || 0));
  if (
    measure.widthInches < 1 ||
    measure.gauge < 1 ||
    measure.lengthFeet < 1 ||
    pallets < 1
  ) {
    return {
      success: false,
      error: "Enter width, gauge, length, and pallet count.",
    };
  }

  const catalog = await listStretchReceiveCatalog();
  const matches = matchStretchCatalog(catalog, measure);
  if (matches.length === 0) {
    return {
      success: false,
      error: `No SKU matches ${measure.widthInches}" · ${measure.gauge} GA · ${measure.lengthFeet} ft (${measure.application}).`,
      matches: [],
    };
  }

  const preferredId = String(input.productId || "").trim();
  const assigned =
    (preferredId
      ? matches.find((item) => item.productId === preferredId)
      : null) ||
    assignStretchSkuForReceive(catalog, measure);

  if (!assigned) {
    return {
      success: false,
      error: "Could not assign a SKU for those measures.",
      matches,
    };
  }

  if (!preferredId && matches.length > 1) {
    const topScore = scoreStretchReceiveCandidate(assigned);
    const tied = matches.filter(
      (item) => scoreStretchReceiveCandidate(item) === topScore
    );
    if (tied.length > 1) {
      return {
        success: false,
        error: "Several SKUs share these measures — pick one.",
        matches: tied,
      };
    }
  }

  const quantity = tarimasToUnits(
    pallets,
    assigned.application,
    assigned.boxesPerPallet
  );
  const result = await adjustWarehouseInventory({
    warehouseCode: input.warehouseCode || USA_WAREHOUSE_CODE,
    productId: assigned.productId,
    delta: quantity,
    reason: "received",
    notes:
      String(input.notes || "").trim() ||
      `Inbound ${pallets} pallet(s) · ${measure.widthInches}" · ${measure.gauge} GA · ${measure.lengthFeet} ft → ${assigned.partNumber || assigned.productId}`,
  });

  if (!result.success) {
    return { success: false, error: result.error, matches };
  }

  return {
    success: true,
    sku: assigned.partNumber,
    productName: assigned.productName,
    productId: assigned.productId,
    stockBoxes: result.stockBoxes,
  };
}

export async function adjustWarehouseInventory(input: {
  warehouseCode?: string;
  productId: string;
  delta: number;
  reason: InventoryAdjustReason;
  notes?: string;
  orderId?: string;
}): Promise<{ success: boolean; stockBoxes?: number; error?: string }> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { success: false, error: "Unauthorized." };

  const productId = String(input.productId || "").trim();
  const delta = Math.trunc(Number(input.delta) || 0);
  if (!productId) return { success: false, error: "Product is required." };
  if (!delta) return { success: false, error: "Enter a non-zero quantity." };

  const warehouse = await getWarehouseByCode(input.warehouseCode || USA_WAREHOUSE_CODE);
  if (!warehouse) return { success: false, error: "Warehouse not found. Run the inventory migration." };

  const client = await db();
  const { data, error } = await client.rpc("adjust_warehouse_stock", {
    p_warehouse_id: warehouse.id,
    p_product_id: productId,
    p_delta: delta,
    p_reason: input.reason,
    p_user_id: staff.user.id,
    p_notes: String(input.notes || "").trim(),
    p_order_id: input.orderId || null,
    p_sync_catalog: warehouse.code === USA_WAREHOUSE_CODE,
  });

  if (error) {
    console.error("[warehouse] adjust:", error.message);
    return { success: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  revalidateInventory();
  return {
    success: true,
    stockBoxes: Math.max(0, Math.floor(Number(row?.stock_boxes) || 0)),
  };
}

export async function bulkReceiveShipment(input: {
  warehouseCode?: string;
  lines: Array<{ productId: string; quantity: number }>;
  notes?: string;
}): Promise<{ success: boolean; received?: number; error?: string }> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { success: false, error: "Unauthorized." };

  const lines = (input.lines || [])
    .map((line) => ({
      productId: String(line.productId || "").trim(),
      quantity: Math.max(0, Math.floor(Number(line.quantity) || 0)),
    }))
    .filter((line) => line.productId && line.quantity > 0);

  if (lines.length === 0) {
    return { success: false, error: "Add at least one product quantity." };
  }

  let received = 0;
  for (const line of lines) {
    const result = await adjustWarehouseInventory({
      warehouseCode: input.warehouseCode || USA_WAREHOUSE_CODE,
      productId: line.productId,
      delta: line.quantity,
      reason: "received",
      notes: input.notes || "Bulk receiving",
    });
    if (!result.success) {
      return {
        success: false,
        received,
        error: result.error || `Failed on product ${line.productId}`,
      };
    }
    received += line.quantity;
  }

  return { success: true, received };
}

export interface WarehouseDispatchOrder {
  id: string;
  createdAt: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  shippingSummary: string;
  totalUsd: number;
  inventorySettled: boolean;
  lines: Array<{
    productId: string;
    productName: string;
    sku: string;
    units: number;
    unitLabel: "boxes" | "rolls";
    application: string;
    widthInches?: number | null;
    gauge?: number | null;
    lengthFeet?: number | null;
    pallets?: number;
  }>;
}

function shippingSummary(address: unknown): string {
  if (!address || typeof address !== "object") return "—";
  const a = address as Record<string, unknown>;
  const parts = [
    a.city || a.shipping_city,
    a.state || a.shipping_state,
    a.zip || a.postal_code || a.shipping_zip,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  return parts.join(", ") || "—";
}

export async function listUsaDispatchQueue(): Promise<WarehouseDispatchOrder[]> {
  const staff = await requireWarehouseStaff();
  if (!staff) return [];

  const client = await db();
  const { data, error } = await client
    .from("orders")
    .select(
      "id, created_at, customer_name, company_name, customer_email, shipping_address, total_usd, payment_status, fulfillment_status, status, inventory_settled, items"
    )
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[warehouse] listUsaDispatchQueue:", error.message);
    return [];
  }

  const paidStatuses = new Set([
    "paid",
    "Paid & Cleared",
    "paid_and_cleared",
    "succeeded",
  ]);

  const orders: WarehouseDispatchOrder[] = [];

  for (const row of data || []) {
    const payment = String(row.payment_status || "").trim();
    const fulfillment = String(
      row.fulfillment_status || row.status || "unfulfilled"
    ).toLowerCase();
    const orderStatus = String(row.status || "").toLowerCase();
    if (orderStatus === "pending_payment") continue;
    if (!paidStatuses.has(payment) && payment.toLowerCase() !== "paid") {
      // Allow Paid & Cleared variants already covered; skip unpaid.
      if (!/paid/i.test(payment)) continue;
    }
    if (
      fulfillment === "fulfilled" ||
      fulfillment === "cancelled" ||
      fulfillment === "canceled"
    ) {
      continue;
    }

    const rawItems = Array.isArray(row.items) ? row.items : [];
    const lines: WarehouseDispatchOrder["lines"] = [];
    for (const item of rawItems) {
      const raw = item as Record<string, unknown>;
      const productId = String(raw.productId || raw.product_id || "").trim();
      const application = String(raw.application || "hand");
      const { units, unitLabel } = lineStockUnits({
        application,
        boxes: Number(raw.totalBoxes ?? raw.boxes ?? raw.quantity) || 0,
        rolls: Number(raw.totalRolls ?? raw.rolls) || 0,
      });
      if (!productId || units < 1) continue;
      const widthInches = Number(raw.widthInches ?? raw.width_inches);
      const gauge = Number(raw.gauge);
      const lengthFeet = Number(raw.lengthFeet ?? raw.length_feet);
      const breakdown = tarimaBreakdown(units, application, null);
      lines.push({
        productId,
        productName: String(
          raw.productName || raw.product_name || raw.name || "Item"
        ),
        sku: String(raw.sku || ""),
        units,
        unitLabel,
        application,
        widthInches:
          Number.isFinite(widthInches) && widthInches > 0 ? widthInches : null,
        gauge: Number.isFinite(gauge) && gauge > 0 ? gauge : null,
        lengthFeet:
          Number.isFinite(lengthFeet) && lengthFeet > 0 ? lengthFeet : null,
        pallets: breakdown.tarimas,
      });
    }

    if (lines.length === 0) continue;

    orders.push({
      id: String(row.id),
      createdAt: String(row.created_at || ""),
      customerName: String(row.customer_name || ""),
      customerCompany: String(row.company_name || ""),
      customerEmail: String(row.customer_email || ""),
      shippingSummary: shippingSummary(row.shipping_address),
      totalUsd: Number(row.total_usd) || 0,
      inventorySettled: row.inventory_settled === true,
      lines,
    });
  }

  return orders;
}

/**
 * Mark order picked & dispatched from USA warehouse.
 * Deducts warehouse stock when payment settlement did not already move inventory.
 */
export async function markOrderPickedAndDispatched(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  const staff = await requireWarehouseStaff();
  if (!staff) return { success: false, error: "Unauthorized." };

  const id = String(orderId || "").trim();
  if (!id) return { success: false, error: "Order id required." };

  const queue = await listUsaDispatchQueue();
  const order = queue.find((item) => item.id === id);
  if (!order) return { success: false, error: "Order is not in the USA dispatch queue." };

  const warehouse = await getWarehouseByCode(USA_WAREHOUSE_CODE);
  if (!warehouse) {
    return { success: false, error: "USA warehouse missing. Run the inventory migration." };
  }

  const client = await db();

  // Avoid double-deduct when Stripe settle already reduced catalog/USA stock.
  if (!order.inventorySettled) {
    for (const line of order.lines) {
      const result = await adjustWarehouseInventory({
        warehouseCode: USA_WAREHOUSE_CODE,
        productId: line.productId,
        delta: -line.units,
        reason: "dispatched",
        notes: `Picked & dispatched ${order.id}`,
        orderId: order.id,
      });
      if (!result.success) {
        return {
          success: false,
          error: result.error || `Stock short for ${line.productName}`,
        };
      }
    }
  }

  const { data: existing } = await client
    .from("orders")
    .select("notes")
    .eq("id", id)
    .maybeSingle();
  const stamp = new Date().toISOString();
  const marker = `USA WH picked & dispatched ${stamp}${
    order.inventorySettled ? " (stock already settled at payment)" : ""
  }`;
  const prior = String(existing?.notes || "").trim();
  const { error } = await client
    .from("orders")
    .update({
      fulfillment_status: "fulfilled",
      status: "fulfilled",
      notes: prior ? `${prior}\n${marker}` : marker,
      updated_at: stamp,
    })
    .eq("id", id);

  if (error) {
    console.error("[warehouse] dispatch update:", error.message);
    return { success: false, error: error.message };
  }

  revalidateInventory();
  revalidatePath("/admin/orders");
  return { success: true };
}

/** Public/catalog helper: USA stock map for storefront badges. */
export async function getUsaWarehouseStockMap(): Promise<
  Map<string, { stockBoxes: number; reorderPoint: number }>
> {
  const map = new Map<string, { stockBoxes: number; reorderPoint: number }>();
  try {
    const client = await db();
    const { data: warehouse } = await client
      .from("warehouses")
      .select("id")
      .eq("code", USA_WAREHOUSE_CODE)
      .maybeSingle();
    if (!warehouse?.id) return map;

    const { data, error } = await client
      .from("warehouse_inventory")
      .select("product_id, stock_boxes, reorder_point")
      .eq("warehouse_id", warehouse.id);
    if (error || !data) return map;

    for (const row of data) {
      map.set(String(row.product_id), {
        stockBoxes: Math.max(0, Math.floor(Number(row.stock_boxes) || 0)),
        reorderPoint: Math.max(0, Math.floor(Number(row.reorder_point) || 0)),
      });
    }
  } catch (err) {
    console.warn("[warehouse] getUsaWarehouseStockMap:", err);
  }
  return map;
}
