import type { SupabaseClient } from "@supabase/supabase-js";
import {
  palletStockShortage,
  soldOutCheckoutMessage,
  trackedPalletStock,
} from "@/lib/pallet-stock";

interface HoldLine {
  productId?: string | null;
  productName: string;
  pallets: number;
}

function missingHoldFunction(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "");
  return (
    code === "PGRST202" ||
    code === "42883" ||
    /does not exist/i.test(message) ||
    /schema cache/i.test(message)
  );
}

/** A real stock or promo rejection. Other database failures are not a quantity problem. */
export function customerHoldMessage(error: { message?: string; details?: string; hint?: string } | null): string | null {
  const text = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .replace(/^[A-Z0-9]{5}:\s*/, "")
    .trim();
  if (/sold out|available for|promo code/i.test(text)) return text.slice(0, 300);
  return null;
}

async function readAvailability(admin: SupabaseClient, lines: HoldLine[]): Promise<string | null> {
  const productIds = [...new Set(lines.map((line) => String(line.productId || "")).filter(Boolean))];
  if (productIds.length === 0) return null;
  const { data, error } = await admin
    .from("products")
    .select("id, name, stock_quantity, stock_qty, is_sold_out")
    .in("id", productIds);
  if (error || !data) return "We couldn't confirm pallet stock. Please try again.";
  const onHand = new Map<string, number | null>();
  const availability = new Map<string, { stock: number | null; soldOut: boolean }>();
  for (const row of data as Array<Record<string, unknown>>) {
    const id = String(row.id || "");
    const stock = trackedPalletStock(row.stock_quantity ?? row.stock_qty);
    onHand.set(id, stock);
    availability.set(id, {
      stock,
      soldOut: row.is_sold_out === true || stock === 0,
    });
  }
  return soldOutCheckoutMessage(lines, availability) || palletStockShortage(lines, onHand);
}

/**
 * Lock pallet stock and a limited promo code onto this pending order.
 * When the SQL functions are not installed yet, fall back to a fresh stock read.
 */
export async function syncCheckoutHolds(
  admin: SupabaseClient,
  orderId: string,
  lines: HoldLine[]
): Promise<string | null> {
  const held = await admin.rpc("sync_checkout_holds", { p_order_id: orderId });
  if (!held.error) return null;
  const reported = customerHoldMessage(held.error);
  if (reported && !missingHoldFunction(held.error)) return reported;
  const availability = await readAvailability(admin, lines);
  if (availability) return availability;
  console.error("[checkout] stock hold skipped", held.error.code || "error");
  return null;
}

/** Return pallet stock and a promo hold when an unpaid order is deleted. */
export async function releaseCheckoutHolds(admin: SupabaseClient, orderId: string): Promise<void> {
  const released = await admin.rpc("release_checkout_holds", { p_order_id: orderId });
  if (released.error && !missingHoldFunction(released.error)) {
    console.error("[checkout] release hold failed", released.error.code || "error");
  }
}
