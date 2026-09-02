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
    id: "genesis-standard",
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
    description: "Engineered for high-throughput rotary arm systems with up to 300% pre-stretch capability and extreme tear stop memory.",
    hoverBorder: "hover:border-emerald-500",
    hoverShadow: "hover:shadow-[0_0_20px_rgba(22,163,74,0.25)]",
    activeBorder: "border-emerald-500",
    activeShadow: "shadow-[0_0_20px_rgba(22,163,74,0.25)]",
  },
];
