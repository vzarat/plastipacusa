"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import { getCurrentUser, signOut, CurrentUserResponse } from "@/actions/auth";
import {
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  Phone,
  LayoutGrid,
  User,
  LogOut,
  Building2,
  ShieldCheck,
  Search,
  Hand,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [mobileSearch, setMobileSearch] = useState("");

  const userMenuRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((state) => state.items);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    let isMounted = true;
    getCurrentUser().then((res) => {
      if (isMounted) setCurrentUser(res);
    });
    return () => {
      isMounted = false;
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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const handleMobileSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = mobileSearch.trim();
    setIsMobileMenuOpen(false);
    if (query) {
      router.push(`/products?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/products");
    }
  };

  const openCart = () => {
    openDrawer();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Mobile top bar: centered logo + cart + hamburger only */}
      <div className="md:hidden relative flex items-center justify-between h-[4.5rem] px-4">
        <button
          type="button"
          onClick={openCart}
          className="relative z-10 p-2 text-slate-700 hover:text-sky-600 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
          aria-label="Shopping Cart"
        >
          <ShoppingCart className="w-5 h-5" />
          {totalItemsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-sm">
              {totalItemsCount}
            </span>
          )}
        </button>

        <Link
          href="/"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          aria-label="Plastipac USA Home"
        >
          <Image
            src={LOGO_SRC}
            alt="Plastipac USA - Industrial Stretch Packaging"
            width={280}
            height={76}
            priority
            className="h-14 w-auto max-w-[min(68vw,240px)] object-contain"
          />
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="relative z-10 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop horizontal layout */}
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
                href="/#category-showcase"
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

          <div className="flex items-center gap-2 sm:gap-2.5">
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
                className="flex items-center gap-2 bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 hover:opacity-95 transition-all cursor-pointer"
              >
                <User className="w-4 h-4 text-white" />
                <span>{t("nav.signIn")}</span>
              </Link>
            )}

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

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 top-[4.5rem] z-40 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed inset-x-0 top-[4.5rem] bottom-0 z-50 overflow-y-auto border-t border-slate-200 bg-white px-4 pt-4 pb-8 space-y-4 shadow-2xl animate-fade-in-up">
            <form onSubmit={handleMobileSearch} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                placeholder="Search stretch film products..."
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              />
            </form>

            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-xs font-bold text-slate-600">{t("nav.language")}:</span>
              <LanguageToggle />
            </div>

            <div className="pt-1 border-t border-slate-100 space-y-2">
              {currentUser ? (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
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
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsMobileMenuOpen(false);
                        await signOut();
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 cursor-pointer"
                    >
                      {t("nav.signOut")}
                    </button>
                  </div>

                  {currentUser.profile.role === "admin" ? (
                    <Link
                      href="/admin"
                      prefetch={false}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                      <span>{t("nav.adminPortal")}</span>
                    </Link>
                  ) : (
                    <Link
                      href="/dashboard"
                      prefetch={false}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t("nav.dashboard")}</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2.5 px-3 text-center text-xs font-semibold text-white bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 hover:opacity-95 rounded-xl transition-all shadow-md shadow-sky-500/20"
                  >
                    {t("nav.signIn")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="py-2.5 px-3 text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    {t("nav.register")}
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-1 border-t border-slate-100 pt-3">
              <p className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t("nav.categories")}
              </p>
              <Link
                href="/products?app=hand"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
              >
                <Hand className="w-4 h-4 text-sky-600" />
                Hand Stretch Film
              </Link>
              <Link
                href="/products?app=machine"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
              >
                <Cpu className="w-4 h-4 text-sky-600" />
                Machine / Automatic Film
              </Link>
              <Link
                href="/#category-showcase"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
              >
                All Categories
              </Link>
            </div>

            <div className="space-y-1 border-t border-slate-100 pt-3">
              <Link
                href="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 text-sm font-semibold rounded-xl ${
                  pathname === "/products" ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t("nav.products")}
              </Link>
              <Link
                href="/about"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3.5 py-2.5 text-sm font-semibold rounded-xl ${
                  pathname === "/about" ? "bg-sky-50 text-sky-700" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t("nav.about")}
              </Link>
              {!currentUser && (
                <Link
                  href="/#inquiry-form"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
                >
                  {t("nav.contact")}
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                openCart();
              }}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-sky-600" />
                {t("nav.cart")}
              </span>
              {totalItemsCount > 0 && (
                <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-sky-600 px-2 text-[11px] font-bold text-white">
                  {totalItemsCount}
                </span>
              )}
            </button>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {t("nav.hotline")}:
              </span>
              <div className="flex flex-col gap-1 font-bold text-slate-800">
                <a href="tel:+19564003683" className="flex items-center gap-1.5 text-sky-700 hover:underline">
                  <Phone className="w-3.5 h-3.5" /> (956) 400 36 83
                </a>
                <a href="tel:+19564006563" className="text-sky-700 hover:underline">
                  (956) 400 65 63
                </a>
              </div>
              <a
                href="mailto:sales@plastipacusa.com"
                className="inline-block pt-1 text-sky-700 hover:underline font-semibold"
              >
                sales@plastipacusa.com
              </a>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
