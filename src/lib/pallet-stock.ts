import { HAND_FULL_PALLET_BOXES } from "@/lib/pricing";
import { resolvePalletizingSpecs } from "@/lib/palletizing";

const MACHINE_FULL_PALLET_ROLLS = 40;

export interface PalletPackageInput {
  application?: string | null;
  boxesPerPackage?: number | null;
  rollsPerPackage?: number | null;
  quantity?: number | null;
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  slug?: string | null;
  name?: string | null;
}

/** Full pallets in one checkout line. A loose box or a half pallet does not consume pallet stock. */
export function fullPalletsForPackage(input: PalletPackageInput): number {
  const quantity = Math.max(0, Math.floor(Number(input.quantity) || 0));
  if (quantity < 1) return 0;
  const application = String(input.application || "").toLowerCase() === "machine" ? "machine" : "hand";
  if (application === "machine") {
    return Math.floor(Number(input.rollsPerPackage) || 0) === MACHINE_FULL_PALLET_ROLLS ? quantity : 0;
  }
  const boxes = Math.floor(Number(input.boxesPerPackage) || 0);
  const specs = resolvePalletizingSpecs({
    widthInches: input.widthInches,
    gauge: input.gauge,
    lengthFeet: input.lengthFeet,
    application: "hand",
    slug: input.slug,
    name: input.name,
  });
  const fullBoxes = new Set([specs.boxesPerFullPallet, HAND_FULL_PALLET_BOXES]);
  return fullBoxes.has(boxes) ? quantity : 0;
}

/** Prefer the stored pallet count. Older orders only have a box count. */
export function orderLinePallets(line: {
  pallets?: number | null;
  boxes?: number | null;
  quantity?: number | null;
}): number {
  if (line.pallets !== null && line.pallets !== undefined) {
    const stored = Math.floor(Number(line.pallets));
    if (Number.isFinite(stored)) return Math.max(0, stored);
  }
  const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
  const boxes = Math.floor(Number(line.boxes) || 0);
  if (boxes < 1 || boxes % quantity !== 0) return 0;
  const perPackage = boxes / quantity;
  return perPackage === 24 || perPackage === 48 || perPackage === 64 ? quantity : 0;
}

/** Null means the catalog row does not track pallet stock. Zero is tracked and sold out. */
export function trackedPalletStock(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const count = Math.floor(Number(value));
  return Number.isFinite(count) ? Math.max(0, count) : null;
}

export function palletAvailabilityLabel(count: number): string {
  const pallets = Math.max(0, Math.floor(Number(count) || 0));
  return pallets === 1 ? "1 Pallet Available" : `${pallets} Pallets Available`;
}

export function soldOutCheckoutMessage(
  lines: Array<{ productId?: string | null; productName: string }>,
  products: Map<string, { stock: number | null; soldOut: boolean }>
): string | null {
  for (const line of lines) {
    const product = products.get(String(line.productId || ""));
    if (!product) continue;
    if (product.soldOut || product.stock === 0) return `${line.productName} is sold out.`;
  }
  return null;
}

export function palletStockShortage(
  lines: Array<{ productId?: string | null; productName: string; pallets: number }>,
  onHandByProduct: Map<string, number | null>
): string | null {
  const demand = new Map<string, { name: string; pallets: number }>();
  for (const line of lines) {
    const productId = String(line.productId || "");
    const pallets = Math.floor(Number(line.pallets) || 0);
    if (!productId || pallets < 1) continue;
    const current = demand.get(productId) || { name: line.productName, pallets: 0 };
    current.pallets += pallets;
    demand.set(productId, current);
  }
  for (const [productId, need] of demand) {
    const onHand = onHandByProduct.get(productId);
    if (onHand == null) continue;
    if (onHand >= need.pallets) continue;
    if (onHand <= 0) return `${need.name} is sold out.`;
    const noun = onHand === 1 ? "pallet is" : "pallets are";
    return `Only ${onHand} full ${noun} available for ${need.name}.`;
  }
  return null;
}
