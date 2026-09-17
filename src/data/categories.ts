export interface CategoryItem {
  id: string;
  name: string;
  type: string;
  logoUrl: string;
  accentHex: string;
  slug: string;
  badge: string;
  description: string;
  hoverBorder: string;
  hoverShadow: string;
  activeBorder: string;
  activeShadow: string;
}

export const PRODUCT_CATEGORIES: CategoryItem[] = [
  {
    id: "force-standard",
    name: "FORCE STANDARD",
    type: "Hand Stretch Film",
    logoUrl: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_ST.svg",
    accentHex: "#2563EB",
    slug: "force-standard",
    badge: "Manual Wrapping",
    description: "High-yield cast manual wrap engineered for maximum load containment, sharp corner puncture resistance, and quiet unwind.",
    hoverBorder: "hover:border-blue-500",
    hoverShadow: "hover:shadow-[0_0_20px_rgba(37,99,235,0.25)]",
    activeBorder: "border-blue-500",
    activeShadow: "shadow-[0_0_20px_rgba(37,99,235,0.25)]",
  },
  {
    id: "force-elite",
    name: "FORCE ELITE",
    type: "Hand Stretch Film",
    logoUrl: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_EL.svg",
    accentHex: "#D97706",
    slug: "force-elite",
    badge: "Ultra High Yield",
    description: "Multi-layer nano technology formulation delivering superior tensile strength at thinner gauges for maximum cost per pallet savings.",
    hoverBorder: "hover:border-amber-500",
    hoverShadow: "hover:shadow-[0_0_20px_rgba(217,119,6,0.25)]",
    activeBorder: "border-amber-500",
    activeShadow: "shadow-[0_0_20px_rgba(217,119,6,0.25)]",
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    name: "GENESIS STANDARD",
    type: "Automatic Stretch Film",
    logoUrl: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/GENESIS_ST.svg",
    accentHex: "#DC2626",
    slug: "genesis-standard",
    badge: "Machine Turntable",
    description: "Heavy-duty automated machine film engineered for high-speed turntable pallet wrappers with consistent stretch performance.",
    hoverBorder: "hover:border-red-500",
    hoverShadow: "hover:shadow-[0_0_20px_rgba(220,38,38,0.25)]",
    activeBorder: "border-red-500",
    activeShadow: "shadow-[0_0_20px_rgba(220,38,38,0.25)]",
  },
  {
    id: "genesis-high-performance",
    name: "GENESIS HIGH PERFORMANCE",
    type: "Automatic Stretch Film",
    logoUrl: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/GENESIS_HP.svg",
    accentHex: "#16A34A",
    slug: "genesis-high-performance",
    badge: "Power Pre-Stretch",
    description: "GENESIS Automatic machine film for high-throughput wrappers — 20\" cast rolls in 5,000 FT and 6,000 FT yields with 1 / 20 / 40 roll pallet tiers.",
    hoverBorder: "hover:border-emerald-500",
    hoverShadow: "hover:shadow-[0_0_20px_rgba(22,163,74,0.25)]",
    activeBorder: "border-emerald-500",
    activeShadow: "shadow-[0_0_20px_rgba(22,163,74,0.25)]",
  },
];

// Any GENESIS category (Standard or High Performance/Elite) is automated machine film; everything else is manual hand film.
export function isGenesisCategory(categorySlugOrId: string): boolean {
  const category = PRODUCT_CATEGORIES.find(
    (c) => c.slug === categorySlugOrId || c.id === categorySlugOrId
  );
  const key = (category?.slug || categorySlugOrId || "").toLowerCase();
  return key.startsWith("genesis");
}

export function getApplicationForCategory(categorySlugOrId: string): "hand" | "machine" {
  return isGenesisCategory(categorySlugOrId) ? "machine" : "hand";
}
