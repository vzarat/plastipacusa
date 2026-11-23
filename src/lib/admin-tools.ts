import { Megaphone, Percent, ShoppingCart, Users, type LucideIcon } from "lucide-react";

export type AdminToolKey = "abandoned-carts" | "discounts" | "leads" | "campaigns";

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
  {
    key: "leads",
    label: "Leads",
    href: "/admin/tools/leads",
    icon: Users,
    description: "Import and manage marketing leads",
  },
  {
    key: "campaigns",
    label: "Campaigns",
    href: "/admin/tools/campaigns",
    icon: Megaphone,
    description: "Email broadcasts and sequences",
  },
];

export function adminToolFromPath(pathname: string | null | undefined): AdminToolKey | null {
  if (!pathname) return null;
  // Legacy routes still highlight the matching tool tab.
  if (pathname.startsWith("/admin/discounts")) return "discounts";
  if (pathname.startsWith("/admin/leads")) return "leads";
  if (pathname.startsWith("/admin/campaigns")) return "campaigns";
  if (!pathname.startsWith("/admin/tools")) return null;
  const match = ADMIN_TOOLS.find(
    (tool) => pathname === tool.href || pathname.startsWith(`${tool.href}/`)
  );
  return match?.key || null;
}
