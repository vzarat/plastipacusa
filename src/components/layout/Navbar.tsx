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
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { useAssistStore } from "@/lib/store/useAssistStore";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [compactLogo, setCompactLogo] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);
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
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
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

  const mobileCartButton = (
    <button
      type="button"
      onClick={openCart}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-transform active:scale-95"
      aria-label="Shopping cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItemsCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold text-white">
          {totalItemsCount > 99 ? "99+" : totalItemsCount}
        </span>
      )}
    </button>
  );

  const mobileMenuButton = (
    <button
      type="button"
      onClick={() => setIsNavOpen((open) => !open)}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition-transform active:scale-95"
      aria-label="Open Navigation Menu"
      aria-expanded={isNavOpen}
      id="mobile-nav-trigger"
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


  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-sm">
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
              {assistButton(true)}
              {mobileCartButton}
              {mobileMenuButton}
            </div>
          </div>
          <form onSubmit={submitCatalogSearch} className="px-4 pb-3">
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
            {assistButton(true)}
            {mobileCartButton}
            {mobileMenuButton}
          </div>
        </div>
      )}

      {/* Desktop layout */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center group py-1.5">
              <Image
                src={LOGO_SRC}
                alt="Plastipac USA - Industrial Stretch Packaging"
                width={240}
                height={65}
                priority
                className="h-14 lg:h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </Link>

            <nav className="flex items-center gap-1 lg:gap-1.5">
              <Link
                href="/products"
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${
                  pathname === "/products"
                    ? "text-sky-700 bg-sky-50/80"
                    : "text-slate-600 hover:text-sky-600 hover:bg-sky-50/50"
                }`}
              >
                {t("nav.products")}
              </Link>

              <Link
                href={categoriesHref}
                onClick={handleCategoriesClick}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl transition-all text-slate-600 hover:text-sky-600 hover:bg-sky-50/50"
              >
                {t("nav.categories")}
              </Link>

              <Link
                href="/about"
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${
                  pathname === "/about"
                    ? "text-sky-700 bg-sky-50/80"
                    : "text-slate-600 hover:text-sky-600 hover:bg-sky-50/50"
                }`}
              >
                {t("nav.about")}
              </Link>

              {!currentUser && (
                <Link
                  href="/#inquiry-form"
                  className="px-3.5 py-2 text-sm font-semibold rounded-xl transition-all text-slate-600 hover:text-sky-600 hover:bg-sky-50/50"
                >
                  {t("nav.contact")}
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <LanguageToggle />

            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-slate-50/90 hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-bold text-slate-800 cursor-pointer shadow-xs"
                  aria-label="User Account Menu"
                >
                  <div
                    className={`w-6 h-6 rounded-lg text-white flex items-center justify-center font-bold text-[11px] uppercase flex-shrink-0 ${
                      currentUser.profile.role === "admin" ? "bg-purple-700" : "bg-slate-900"
                    }`}
                  >
                    {currentUser.profile.fullName?.charAt(0) || "C"}
                  </div>
                  <span className="hidden sm:inline truncate max-w-[120px]">
                    {currentUser.profile.fullName || currentUser.user.email?.split("@")[0]}
                  </span>
                  {currentUser.profile.role === "admin" ? (
                    <span className="hidden md:inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-2.5 h-2.5 text-purple-600" />
                      {t("role.admin")}
                    </span>
                  ) : (
                    <span className="hidden md:inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      <Building2 className="w-2.5 h-2.5 text-blue-600" />
                      {t("role.client")}
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fade-in-up">
                    <div className="px-4 py-2.5 border-b border-slate-100 space-y-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.profile.fullName || currentUser.user.email}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {currentUser.profile.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-2.5 h-2.5 text-purple-600" />
                            {t("role.admin")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            <Building2 className="w-2.5 h-2.5 text-blue-600" />
                            {t("role.client")}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 truncate max-w-[120px]">
                          {currentUser.profile.companyName || t("role.partner")}
                        </span>
                      </div>
                    </div>

                    {currentUser.profile.role === "admin" ? (
                      <Link
                        href="/admin"
                        prefetch={false}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <span>{t("nav.adminPortal")}</span>
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard"
                        prefetch={false}
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                      >
                        <LayoutGrid className="w-4 h-4 text-slate-400" />
                        <span>{t("nav.dashboard")}</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await signOut();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer border-t border-slate-100"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>{t("nav.signOut")}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                data-tour="nav-sign-in"
                className="flex items-center gap-2 bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 hover:opacity-95 transition-all cursor-pointer"
              >
                <User className="w-4 h-4 text-white" />
                <span>{t("nav.signIn")}</span>
              </Link>
            )}

            {assistButton(false)}

            {currentUser ? (
              <Link
                href="/cart"
                onClick={(e) => {
                  e.preventDefault();
                  openCart();
                }}
                className="relative p-2 text-slate-700 hover:text-blue-600 rounded-full border border-slate-200 hover:border-slate-300 transition-colors"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-sm">
                    {totalItemsCount}
                  </span>
                )}
              </Link>
            ) : (
              <Button
                variant="outline"
                size="default"
                onClick={openCart}
                className="relative flex items-center gap-2 px-3.5 h-10 border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-300 text-slate-800 rounded-xl shadow-xs transition-all cursor-pointer"
                aria-label="View Cart and Quote Request"
              >
                <ShoppingCart className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-semibold">{t("nav.cart")}</span>
                {totalItemsCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-1.5 text-[11px] font-bold text-white shadow-xs">
                    {totalItemsCount}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <MobileNavDrawer open={isNavOpen} onClose={() => setIsNavOpen(false)} />
    </header>
  );
}
