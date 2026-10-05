"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";

function isCatalogPath(pathname: string) {
  return (
    pathname === "/catalog" ||
    pathname.startsWith("/catalog/") ||
    pathname === "/products" ||
    pathname.startsWith("/products/")
  );
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

const tabClass = (active: boolean) =>
  `flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] transition-transform active:scale-95 ${
    active ? "bg-sky-50 font-bold text-sky-600" : "font-medium text-slate-500"
  }`;

export function MobileFloatingNavbar() {
  const pathname = usePathname() || "/";
  const openDrawer = useCartStore((state) => state.openDrawer);
  const cartOpen = useCartStore((state) => state.isDrawerOpen);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0)
  );

  if (isNavbarHidden(pathname)) return null;

  const homeActive = pathname === "/" && !cartOpen;
  const catalogActive = isCatalogPath(pathname) && !cartOpen;
  const accountActive = pathname.startsWith("/dashboard") && !cartOpen;

  return (
    <div className="block md:hidden">
      <nav
        aria-label="Primary"
        className="fixed bottom-4 left-4 right-4 z-50 flex items-end justify-between rounded-2xl border border-gray-200/80 bg-white/90 px-3 py-2 shadow-2xl backdrop-blur-lg transition-all duration-300 md:hidden"
      >
        <Link href="/" aria-current={homeActive ? "page" : undefined} className={tabClass(homeActive)}>
          <Home className="h-5 w-5" strokeWidth={homeActive ? 2.4 : 2} />
          <span>Home</span>
        </Link>

        <Link
          href="/catalog"
          aria-current={catalogActive ? "page" : undefined}
          className={tabClass(catalogActive)}
        >
          <LayoutGrid className="h-5 w-5" strokeWidth={catalogActive ? 2.4 : 2} />
          <span>Catalog</span>
        </Link>

        <div className="flex flex-1 flex-col items-center">
          <button
            type="button"
            onClick={openDrawer}
            aria-label="Cart"
            className={`-mt-7 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 ${
              cartOpen ? "bg-sky-700 shadow-sky-700/30" : "bg-sky-600 shadow-sky-600/30"
            }`}
          >
            <span className="relative">
              <ShoppingBag className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-sky-700">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </span>
          </button>
          <span className={`mt-1 text-[10px] ${cartOpen ? "font-bold text-sky-600" : "font-medium text-slate-500"}`}>
            Cart
          </span>
        </div>

        <Link
          href="/dashboard"
          aria-current={accountActive ? "page" : undefined}
          className={tabClass(accountActive)}
        >
          <User className="h-5 w-5" strokeWidth={accountActive ? 2.4 : 2} />
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
}
