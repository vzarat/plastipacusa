"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/catalog", label: "Catalog", icon: LayoutGrid },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/dashboard", label: "Account", icon: User },
] as const;

function isCatalogPath(pathname: string) {
  return (
    pathname === "/catalog" ||
    pathname.startsWith("/catalog/") ||
    pathname === "/products" ||
    pathname.startsWith("/products/")
  );
}

function isTabActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/catalog") return isCatalogPath(pathname);
  if (href === "/cart") return pathname === "/cart" || pathname.startsWith("/cart/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavbarHidden(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/checkout")
  );
}

export function MobileFloatingNavbar() {
  const pathname = usePathname() || "/";
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0)
  );

  if (isNavbarHidden(pathname)) return null;

  return (
    <div className="block md:hidden">
      <nav
        aria-label="Primary"
        className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white/90 px-3 py-2 shadow-2xl backdrop-blur-lg transition-all duration-300 md:hidden"
      >
        {TABS.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-transform active:scale-95 ${
                active
                  ? "bg-sky-50 font-bold text-sky-600"
                  : "font-medium text-slate-500"
              }`}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                {tab.href === "/cart" && cartCount > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
