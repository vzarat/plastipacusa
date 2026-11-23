import { Percent, ShoppingCart, type LucideIcon } from "lucide-react";

export type AdminToolKey = "abandoned-carts" | "discounts";

export interface AdminToolNavItem {
  key: AdminToolKey;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

/** Top submenu under Admin → Tools. Add new tools here as they ship. */
export const ADMIN_TOOLS: AdminToolNavItem[] = [
  {
    key: "abandoned-carts",
    label: "Abandoned Carts",
    href: "/admin/tools/abandoned-carts",
    icon: ShoppingCart,
    description: "Recover carts that never completed checkout",
  },
  {
    key: "discounts",
    label: "Discounts",
    href: "/admin/tools/discounts",
    icon: Percent,
    description: "Coupons and promotional discounts",
  },
];

export function adminToolFromPath(pathname: string | null | undefined): AdminToolKey | null {
  if (!pathname) return null;
  // Legacy discounts route still highlights the Discounts tool tab.
  if (pathname.startsWith("/admin/discounts")) return "discounts";
  if (!pathname.startsWith("/admin/tools")) return null;
  const match = ADMIN_TOOLS.find(
    (tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`)
  );
  return match?.key || null;
}
