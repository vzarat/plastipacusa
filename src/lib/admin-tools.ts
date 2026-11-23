import { ShoppingCart, type LucideIcon } from "lucide-react";

export type AdminToolKey = "abandoned-carts";

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
];

export function adminToolFromPath(pathname: string | null | undefined): AdminToolKey | null {
  if (!pathname?.startsWith("/admin/tools")) return null;
  const match = ADMIN_TOOLS.find((tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`));
  return match?.key || null;
}
