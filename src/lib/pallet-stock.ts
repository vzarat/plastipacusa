import { HAND_FULL_PALLET_BOXES } from "@/lib/pricing";
import { resolvePalletizingSpecs } from "@/lib/palletizing";

const MACHINE_FULL_PALLET_ROLLS = 40;
const PALLET_SCALE = 1_000_000;

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

/** Round a pallet count to one millionth so 1/64 of a pallet stays exact. */
export function roundPalletStock(value: unknown): number {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.round(count * PALLET_SCALE) / PALLET_SCALE;
}

export function formatPalletCount(count: number): string {
  const rounded = roundPalletStock(count);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Pallet share for one checkout line.
 * A full machine pallet is 40 rolls and a half pallet is 20 rolls.
 * Hand film uses the warehouse full-pallet box count, so loose boxes and half pallets
 * consume a fraction of one pallet.
 */
export function fullPalletsForPackage(input: PalletPackageInput): number {
  const quantity = Math.max(0, Math.floor(Number(input.quantity) || 0));
  if (quantity < 1) return 0;
  const application = String(input.application || "").toLowerCase() === "machine" ? "machine" : "hand";
  if (application === "machine") {
    const rolls = Math.floor(Number(input.rollsPerPackage) || 0);
    if (rolls < 1) return 0;
    return roundPalletStock((rolls * quantity) / MACHINE_FULL_PALLET_ROLLS);
  }
  const boxes = Math.floor(Number(input.boxesPerPackage) || 0);
  if (boxes < 1) return 0;
  const fullBoxes = boxesPerPalletForProduct(input);
  if (fullBoxes < 1) return 0;
  return roundPalletStock((boxes * quantity) / fullBoxes);
}

/**
 * Boxes represented by one full pallet.
 * A stored boxes_per_pallet wins. Otherwise hand film uses 24 or 64.
 * Machine film is tracked in rolls, so this returns 0.
 */
export function boxesPerPalletForProduct(input: PalletPackageInput & { boxesPerPallet?: number | null }): number {
  const stored = Math.floor(Number(input.boxesPerPallet) || 0);
  if (stored > 0) return stored;
  const application = String(input.application || "").toLowerCase() === "machine" ? "machine" : "hand";
  if (application === "machine") return 0;
  const specs = resolvePalletizingSpecs({
    widthInches: input.widthInches,
    gauge: input.gauge,
    lengthFeet: input.lengthFeet,
    application: "hand",
    slug: input.slug,
    name: input.name,
  });
  // Compact 18" x 80 GA pallets are 24 boxes. Every other hand film sells a 64-box pallet.
  return specs.boxesPerFullPallet === 24
    ? 24
    : Math.max(specs.boxesPerFullPallet, HAND_FULL_PALLET_BOXES);
}

/** Prefer the stored pallet count. Older orders only have a box count. */
export function orderLinePallets(line: {
  pallets?: number | null;
  boxes?: number | null;
  quantity?: number | null;
}): number {
  if (line.pallets !== null && line.pallets !== undefined) {
    const stored = Number(line.pallets);
    if (Number.isFinite(stored)) return roundPalletStock(Math.max(0, stored));
  }
  const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
  const boxes = Math.floor(Number(line.boxes) || 0);
  if (boxes < 1 || boxes % quantity !== 0) return 0;
  const perPackage = boxes / quantity;
  return perPackage === 24 || perPackage === 48 || perPackage === 64 ? quantity : 0;
}

export interface PalletStockParts {
  fullPallets: number;
  looseBoxes: number;
  totalBoxes: number;
}

/**
 * One pallet balance breaks into whole pallets plus the open pallet's boxes.
 * stock_quantity stays the only stored quantity. These counts are derived.
 */
export function describePalletStock(onHandPallets: number, boxesPerPallet: number): PalletStockParts {
  const ratio = Math.floor(Number(boxesPerPallet) || 0);
  if (ratio < 1) return { fullPallets: 0, looseBoxes: 0, totalBoxes: 0 };
  const totalBoxes = Math.max(0, Math.round(roundPalletStock(onHandPallets) * ratio));
  const fullPallets = Math.floor(totalBoxes / ratio);
  return {
    fullPallets,
    looseBoxes: totalBoxes - fullPallets * ratio,
    totalBoxes,
  };
}

/**
 * Subtract purchased boxes from a pallet balance.
 * Null stock is untracked and is left unchanged.
 * A missing ratio uses palletFallback, the fraction checkout already computed.
 * A shortage returns null.
 */
export function deductBoxesFromPalletStock(
  onHandPallets: number | null,
  boxesPerPallet: number | null,
  boxes: number,
  palletFallback?: number | null
): number | null {
  if (onHandPallets == null) return null;
  const onHand = roundPalletStock(onHandPallets);
  const ratio = Math.floor(Number(boxesPerPallet) || 0);
  const sold = Math.floor(Number(boxes) || 0);
  const deduction =
    ratio > 0 && sold > 0
      ? roundPalletStock(sold / ratio)
      : roundPalletStock(Math.max(0, Number(palletFallback) || 0));
  if (deduction <= 0) return onHand;
  if (onHand < deduction) return null;
  return roundPalletStock(onHand - deduction);
}

/** Display-only label. Does not change stock_quantity. */
export function palletStockLabel(onHandPallets: number | null, boxesPerPallet?: number | null): string | null {
  if (onHandPallets == null || onHandPallets <= 0) return null;
  const ratio = Math.floor(Number(boxesPerPallet) || 0);
  if (ratio < 1) return palletAvailabilityLabel(onHandPallets);
  const parts = describePalletStock(onHandPallets, ratio);
  if (parts.totalBoxes <= 0) return null;
  if (parts.looseBoxes > 0) {
    const palletLabel = parts.fullPallets === 1 ? "full pallet" : "full pallets";
    const boxLabel = parts.looseBoxes === 1 ? "box" : "boxes";
    return `${parts.fullPallets} ${palletLabel} and ${parts.looseBoxes} ${boxLabel}`;
  }
  return palletAvailabilityLabel(parts.fullPallets);
}

/** Null means the catalog row does not track pallet stock. Zero is tracked and sold out. */
export function trackedPalletStock(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  if (!Number.isFinite(count)) return null;
  return roundPalletStock(Math.max(0, count));
}

export function palletAvailabilityLabel(count: number): string {
  const pallets = roundPalletStock(count);
  if (pallets === 1) return "1 Pallet Available";
  return `${formatPalletCount(pallets)} Pallets Available`;
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

function shortageCopy(name: string, onHand: number, boxesPerPallet?: number | null): string {
  if (onHand <= 0) return `${name} is sold out.`;
  const ratio = Math.floor(Number(boxesPerPallet) || 0);
  if (ratio > 0) {
    const parts = describePalletStock(onHand, ratio);
    if (parts.totalBoxes <= 0) return `${name} is sold out.`;
    if (parts.looseBoxes > 0) {
      const palletLabel = parts.fullPallets === 1 ? "full pallet" : "full pallets";
      const boxLabel = parts.looseBoxes === 1 ? "box" : "boxes";
      return `Only ${parts.fullPallets} ${palletLabel} and ${parts.looseBoxes} ${boxLabel} are available for ${name}.`;
    }
  }
  const label = formatPalletCount(onHand);
  const whole = Number.isInteger(roundPalletStock(onHand));
  if (whole && roundPalletStock(onHand) === 1) {
    return `Only 1 full pallet is available for ${name}.`;
  }
  if (whole) return `Only ${label} full pallets are available for ${name}.`;
  const noun = roundPalletStock(onHand) === 1 ? "pallet is" : "pallets are";
  return `Only ${label} ${noun} available for ${name}.`;
}

function boxesPerPalletFromDemand(pallets: number, boxes: number): number | null {
  if (!(pallets > 0) || !(boxes > 0)) return null;
  const ratio = Math.round(boxes / pallets);
  if (ratio < 1) return null;
  if (roundPalletStock(boxes / ratio) !== roundPalletStock(pallets)) return null;
  return ratio;
}

export function palletStockShortage(
  lines: Array<{ productId?: string | null; productName: string; pallets: number; boxes?: number | null }>,
  onHandByProduct: Map<string, number | null>
): string | null {
  const demand = new Map<string, { name: string; pallets: number; boxes: number }>();
  for (const line of lines) {
    const productId = String(line.productId || "");
    const pallets = roundPalletStock(line.pallets);
    if (!productId || pallets <= 0) continue;
    const current = demand.get(productId) || { name: line.productName, pallets: 0, boxes: 0 };
    current.pallets = roundPalletStock(current.pallets + pallets);
    current.boxes += Math.max(0, Math.floor(Number(line.boxes) || 0));
    demand.set(productId, current);
  }
  for (const [productId, need] of demand) {
    const onHand = onHandByProduct.get(productId);
    if (onHand == null) continue;
    const available = roundPalletStock(onHand);
    if (available >= need.pallets) continue;
    return shortageCopy(need.name, available, boxesPerPalletFromDemand(need.pallets, need.boxes));
  }
  return null;
}
