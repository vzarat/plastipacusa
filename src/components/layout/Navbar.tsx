"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import { getCurrentUser, signOut, CurrentUserResponse } from "@/actions/auth";
import {
  ShoppingCart,
  ChevronDown,
  Search,
  LayoutGrid,
  User,
  LogOut,
  Building2,
  ShieldCheck,
  Menu,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { useAssistStore } from "@/lib/store/useAssistStore";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [compactLogo, setCompactLogo] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const items = useCartStore((state) => state.items);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const openAssist = useAssistStore((state) => state.setOpen);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    let isActive = true;
    getCurrentUser().then((res) => {
      if (isActive) setCurrentUser(res);
    });
    return () => {
      isActive = false;
    };
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const menus = document.querySelectorAll("[data-user-menu]");
      const inside = Array.from(menus).some((node) => node.contains(target));
      if (!inside) setIsUserMenuOpen(false);
    }

    if (typeof document === "undefined") return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setCompactLogo(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mobileLogoClass = `w-auto object-contain transition-all duration-300 ease-in-out ${
    compactLogo ? "h-7" : "h-12"
  }`;

  const openCart = () => openDrawer();

  const assistHintPopup = (
    <div
      role="status"
      className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-sky-100 bg-white px-3 py-2 text-left text-xs font-medium leading-snug text-slate-700 shadow-lg"
    >
      <span className="absolute -top-1 left-6 h-2 w-2 rotate-45 border-l border-t border-sky-100 bg-white" />
      Use Assist AI to find the right film for your wrap.
    </div>
  );

  const assistButton = (compact: boolean) => (
    <button
      type="button"
      onClick={() => openAssist(true)}
      className={
        compact
          ? "flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-transform active:scale-95"
          : "inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 shadow-xs transition-all hover:border-sky-300 hover:bg-slate-50"
      }
      aria-label="Assist AI"
    >
      <Sparkles className={`${compact ? "h-5 w-5" : "h-4 w-4"} text-sky-600`} />
      {!compact && <span className="text-xs font-semibold">Assist AI</span>}
    </button>
  );

  const mobileCartButton = () => (
    <button
      type="button"
      onClick={openCart}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 transition-transform active:scale-95"
      aria-label="Cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItemsCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold leading-none text-white">
          {totalItemsCount > 99 ? "99+" : totalItemsCount}
        </span>
      )}
    </button>
  );

  const mobileMenuButton = () => (
    <button
      type="button"
      onClick={() => setIsNavOpen((open) => !open)}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 transition-transform active:scale-95"
      aria-label={isNavOpen ? "Close menu" : "Open menu"}
      aria-expanded={isNavOpen}
      data-tour="nav-trigger"
    >
      <span className="relative h-5 w-5">
        <Menu
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isNavOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          }`}
        />
        <X
          className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            isNavOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          }`}
        />
      </span>
    </button>
  );
  const isHomePage = pathname === "/";
  const isCatalogPage =
    pathname === "/catalog" ||
    pathname === "/products" ||
    pathname.startsWith("/products/");
  const [assistHint, setAssistHint] = useState(false);

  useEffect(() => {
    if (!isCatalogPage) {
      setAssistHint(false);
      return;
    }
    setAssistHint(true);
    const timer = window.setTimeout(() => setAssistHint(false), 5000);
    return () => window.clearTimeout(timer);
  }, [isCatalogPage]);

  const submitCatalogSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchInputRef.current?.value.trim() || "";
    const listing =
      pathname === "/catalog" || pathname === "/products" ? pathname : "/products";
    router.push(query ? `${listing}?q=${encodeURIComponent(query)}` : listing);
  };

  const handleCategoriesClick = (
    event: React.MouseEvent<HTMLAnchorElement>
  ) => {
    if (!isHomePage) return;
    event.preventDefault();
    const target =
      document.getElementById("categories") ||
      document.getElementById("category-showcase") ||
      document.getElementById("product-catalog-section");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const categoriesHref = isHomePage ? "/#categories" : "/products";

  const roleLabel =
    currentUser?.profile.role === "admin"
      ? "Admin"
      : currentUser?.profile.role === "specialist"
        ? "Specialist"
        : "Customer";

  const accountMenu = (compact: boolean) =>
    currentUser ? (
      <div className="relative shrink-0" data-user-menu>
        <button
          type="button"
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={
            compact
              ? "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-2 text-xs font-bold text-slate-800"
              : "flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-slate-50/90 p-1.5 text-xs font-bold text-slate-800 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-100 xl:px-3 xl:py-2"
          }
          aria-label="Account menu"
          aria-expanded={isUserMenuOpen}
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold uppercase text-white ${
              currentUser.profile.role === "admin" ? "bg-purple-700" : "bg-slate-900"
            }`}
          >
            {currentUser.profile.fullName?.charAt(0) || "C"}
          </div>
          {!compact && (
            <span className="hidden max-w-[120px] truncate xl:inline">
              {currentUser.profile.fullName || currentUser.user.email?.split("@")[0]}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              currentUser.profile.role === "admin"
                ? "border-purple-200 bg-purple-100 text-purple-800"
                : "border-blue-200 bg-blue-100 text-blue-800"
            }`}
          >
            {currentUser.profile.role === "admin" ? (
              <ShieldCheck className="h-2.5 w-2.5 text-purple-600" />
            ) : (
              <Building2 className="h-2.5 w-2.5 text-blue-600" />
            )}
            {roleLabel}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>

        {isUserMenuOpen && (
          <div className="absolute right-0 z-50 mt-2 w-64 animate-fade-in-up rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
            <div className="space-y-1.5 border-b border-slate-100 px-4 py-2.5">
              <p className="truncate text-xs font-bold text-slate-900">
                {currentUser.profile.fullName || currentUser.user.email}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    currentUser.profile.role === "admin"
                      ? "border-purple-200 bg-purple-100 text-purple-800"
                      : "border-blue-200 bg-blue-100 text-blue-800"
                  }`}
                >
                  {currentUser.profile.role === "admin" ? (
                    <ShieldCheck className="h-2.5 w-2.5 text-purple-600" />
                  ) : (
                    <Building2 className="h-2.5 w-2.5 text-blue-600" />
                  )}
                  {roleLabel}
                </span>
                <span className="max-w-[140px] truncate text-[11px] text-slate-500">
                  {currentUser.profile.companyName || "Company"}
                </span>
              </div>
            </div>

            {currentUser.profile.role === "admin" ? (
              <Link
                href="/admin"
                prefetch={false}
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-purple-700 transition-colors hover:bg-purple-50"
              >
                <ShieldCheck className="h-4 w-4 text-purple-600" />
                <span>Admin</span>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                prefetch={false}
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
              >
                <LayoutGrid className="h-4 w-4 text-slate-400" />
                <span>Dashboard</span>
              </Link>
            )}

            <button
              type="button"
              onClick={async () => {
                setIsUserMenuOpen(false);
                await signOut();
              }}
              className="flex w-full cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    ) : (
      <Link
        href="/login"
        data-tour="nav-sign-in"
        className={
          compact
            ? "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 px-3 text-xs font-semibold text-white shadow-md shadow-sky-500/20"
            : "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:opacity-95 hover:shadow-lg hover:shadow-sky-500/30 xl:px-5 xl:py-2.5 xl:text-sm"
        }
      >
        <User className="h-4 w-4 text-white" />
        <span>Log In</span>
      </Link>
    );

  return (
    <header
      className={`sticky top-0 z-50 w-full overflow-visible border-b transition-all duration-200 ${
        scrolled
          ? "border-slate-200 bg-white/90 shadow-sm backdrop-blur"
          : "border-transparent bg-white shadow-none"
      }`}
    >
      {isCatalogPage ? (
        <div className="md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center" aria-label="Plastipac USA Home">
              <Image
                src={LOGO_SRC}
                alt="Plastipac USA"
                width={140}
                height={36}
                priority
                className={mobileLogoClass}
              />
            </Link>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-transform active:scale-95"
                aria-label="Search catalog"
              >
                <Search className="h-5 w-5" />
              </button>
              {mobileCartButton()}
              {mobileMenuButton()}
            </div>
          </div>
          <form onSubmit={submitCatalogSearch} className="px-4 pb-3">
            {assistHint && (
              <p
                role="status"
                className="mb-2 rounded-xl border border-sky-100 bg-white px-3 py-2 text-xs font-medium leading-snug text-slate-700 shadow-md"
              >
                Use Assist AI to find the right film for your wrap.
              </p>
            )}
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="search"
                name="q"
                placeholder="Search films, part numbers..."
                className="h-10 w-full rounded-xl border border-gray-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
          </form>
        </div>
      ) : (
        <div className="relative flex h-14 items-center justify-center px-4 md:hidden">
          <Link
            href="/"
            className="absolute left-1/2 flex -translate-x-1/2 items-center"
            aria-label="Plastipac USA Home"
          >
            <Image
              src={LOGO_SRC}
              alt="Plastipac USA"
              width={140}
              height={36}
              priority
              className={mobileLogoClass}
            />
          </Link>
          <div className="relative z-10 ml-auto flex items-center gap-1">
            {mobileCartButton()}
            {mobileMenuButton()}
          </div>
        </div>
      )}

      <div className="mx-auto hidden h-16 max-w-7xl items-center gap-3 px-4 md:flex md:px-6 lg:hidden">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Plastipac USA Home">
          <Image
            src={LOGO_SRC}
            alt="Plastipac USA"
            width={180}
            height={48}
            priority
            className="h-11 w-auto object-contain"
          />
        </Link>

        {isCatalogPage ? (
          <form onSubmit={submitCatalogSearch} className="min-w-0 flex-1">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                name="q"
                placeholder="Search films, part numbers..."
                aria-label="Search catalog"
                className="h-10 w-full min-w-0 rounded-xl border border-gray-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </label>
          </form>
        ) : (
          <div className="min-w-0 flex-1" />
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          {accountMenu(true)}
          <div className="relative">
            {assistButton(true)}
            {assistHint && (
              <div
                role="status"
                className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-sky-100 bg-white px-3 py-2 text-left text-xs font-medium leading-snug text-slate-700 shadow-lg"
              >
                Use Assist AI to find the right film for your wrap.
              </div>
            )}
          </div>
          {mobileCartButton()}
          {mobileMenuButton()}
        </div>
      </div>

      <div className="mx-auto hidden max-w-7xl overflow-visible px-4 xl:px-8 lg:block">
        <div className="flex h-16 items-center justify-between gap-3 overflow-visible xl:h-24">
          <div className="flex min-w-0 items-center gap-3 xl:gap-8">
            <Link href="/" className="group flex shrink-0 items-center py-1.5">
              <Image
                src={LOGO_SRC}
                alt="Plastipac USA - Industrial Stretch Packaging"
                width={240}
                height={65}
                priority
                className="h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105 xl:h-16"
              />
            </Link>

            <nav className="flex min-w-0 items-center gap-0.5">
              <div className="relative">
                <Link
                  href="/products"
                  className={`whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-semibold transition-all xl:px-3.5 xl:text-sm ${
                    pathname === "/products" || pathname.startsWith("/products/")
                      ? "bg-sky-50/80 text-sky-700"
                      : "text-slate-600 hover:bg-sky-50/50 hover:text-sky-600"
                  }`}
                >
                  Products
                </Link>
                {assistHint && assistHintPopup}
              </div>

              <Link
                href={categoriesHref}
                onClick={handleCategoriesClick}
                className="whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-semibold text-slate-600 transition-all hover:bg-sky-50/50 hover:text-sky-600 xl:px-3.5 xl:text-sm"
              >
                Categories
              </Link>

              <Link
                href="/about"
                className={`whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-semibold transition-all xl:px-3.5 xl:text-sm ${
                  pathname === "/about"
                    ? "bg-sky-50/80 text-sky-700"
                    : "text-slate-600 hover:bg-sky-50/50 hover:text-sky-600"
                }`}
              >
                About Us
              </Link>

              {!currentUser && (
                <Link
                  href="/#inquiry-form"
                  className="whitespace-nowrap rounded-xl px-2 py-2 text-[13px] font-semibold text-slate-600 transition-all hover:bg-sky-50/50 hover:text-sky-600 xl:px-3.5 xl:text-sm"
                >
                  Contact
                </Link>
              )}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap xl:gap-3">
            <LanguageToggle />
            {accountMenu(false)}
            <span className="xl:hidden">{assistButton(true)}</span>
            <span className="hidden xl:inline-flex">{assistButton(false)}</span>

            {currentUser ? (
              <Link
                href="/cart"
                onClick={(e) => {
                  e.preventDefault();
                  openCart();
                }}
                className="relative shrink-0 rounded-full border border-slate-200 p-2 text-slate-700 transition-colors hover:border-slate-300 hover:text-blue-600"
                aria-label="Cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItemsCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold leading-none text-white shadow-sm">
                    {totalItemsCount > 99 ? "99+" : totalItemsCount}
                  </span>
                )}
              </Link>
            ) : (
              <Button
                variant="outline"
                size="default"
                onClick={openCart}
                className="relative flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border-slate-200 bg-white px-2.5 text-slate-800 shadow-xs transition-all hover:border-sky-300 hover:bg-slate-50 xl:px-3.5"
                aria-label="Cart"
              >
                <ShoppingCart className="h-4 w-4 text-sky-600" />
                <span className="hidden text-xs font-semibold xl:inline">Cart</span>
                {totalItemsCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-1.5 text-[11px] font-bold leading-none text-white shadow-xs">
                    {totalItemsCount > 99 ? "99+" : totalItemsCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <MobileNavDrawer
        open={isNavOpen}
        onClose={() => setIsNavOpen(false)}
        signedIn={Boolean(currentUser)}
        isAdmin={currentUser?.profile.role === "admin"}
        onSignOut={() => {
          void signOut();
        }}
      />
    </header>
  );
}
