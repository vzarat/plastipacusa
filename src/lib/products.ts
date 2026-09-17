/**
 * Product catalog helpers, warehouse palletizing metadata, and packaging tier rules.
 */
export {
  resolvePalletizingSpecs,
  isExcludedFifteenInchEightyGauge,
  fullPalletPackageLabel,
  type PalletizingSpecs,
  type PalletizingInput,
} from "@/lib/palletizing";

export interface PackageOptionLike {
  rolls: number;
  label: string;
  sku: string;
  price: number;
}

/** True for Machine High-Yield / automatic cast films (sold by the roll, not boxed). */
export function isMachineFilm(product: {
  application?: string | null;
  applicationType?: string | null;
  categorySlug?: string | null;
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  brand?: string | null;
  widthInches?: number | string | null;
  width_inches?: number | string | null;
}): boolean {
  const app = String(
    product.application || product.applicationType || ""
  ).toLowerCase();
  if (app === "machine") return true;

  const width = Math.round(
    Number(product.widthInches ?? product.width_inches ?? 0)
  );
  if (width === 20) return true;

  const haystack = [
    product.categorySlug,
    product.slug,
    product.name,
    product.title,
    product.brand,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("machine") ||
    haystack.includes("genesis") ||
    haystack.includes("high-yield") ||
    haystack.includes("automatic") ||
    haystack.includes("20-x") ||
    haystack.includes('20"')
  );
}

/** Canonical machine film package tiers (no boxes). */
export const MACHINE_PACKAGE_TIERS = [
  { rolls: 1, label: "1 ROLL", suffix: "1R" },
  { rolls: 20, label: "20 ROLLS (HALF PALLET)", suffix: "20R" },
  { rolls: 40, label: "40 ROLLS (FULL PALLET)", suffix: "40R" },
] as const;

/** Canonical hand film full-pallet pack-out (3 layers × 64 rolls). */
export const HAND_FULL_PALLET = {
  boxes: 48,
  rolls: 192,
  label: "48 BOXES = 192 ROLLS (FULL PALLET)",
} as const;

export function unitLabelForProduct(isMachine: boolean): string {
  return isMachine ? "Roll" : "Box";
}

export function normalizeMachinePackageLabel(rolls: number, label?: string): string {
  const upper = String(label || "").toUpperCase();
  if (rolls === 1 || upper.includes("1 ROLL") || (upper.includes("1 BOX") && rolls <= 4)) {
    return "1 ROLL";
  }
  if (rolls === 20 || upper.includes("HALF PALLET") || upper.includes("20 ROLL")) {
    return "20 ROLLS (HALF PALLET)";
  }
  if (
    rolls === 40 ||
    upper.includes("FULL PALLET") ||
    upper.includes("40 ROLL") ||
    rolls === 256 ||
    rolls === 192
  ) {
    return "40 ROLLS (FULL PALLET)";
  }
  if (upper.includes("BOX")) {
    // Strip box language for machine films
    if (rolls <= 1) return "1 ROLL";
    return `${rolls} ROLLS`;
  }
  return label || `${rolls} ROLLS`;
}

export function buildMachinePackageOptions(input: {
  baseSku: string;
  price1?: number | null;
  price20?: number | null;
  price40?: number | null;
}): PackageOptionLike[] {
  const tiers: Array<{ rolls: number; label: string; suffix: string; price: number | null | undefined }> = [
    { ...MACHINE_PACKAGE_TIERS[0], price: input.price1 },
    { ...MACHINE_PACKAGE_TIERS[1], price: input.price20 },
    { ...MACHINE_PACKAGE_TIERS[2], price: input.price40 },
  ];

  return tiers
    .filter((tier) => tier.price !== null && tier.price !== undefined && Number(tier.price) > 0)
    .map((tier) => ({
      rolls: tier.rolls,
      label: tier.label,
      sku: `${input.baseSku}-${tier.suffix}`,
      price: Number(tier.price),
    }));
}
