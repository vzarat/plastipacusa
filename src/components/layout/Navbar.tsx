"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import { getCurrentUser, signOut, CurrentUserResponse } from "@/actions/auth";
import {
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  LayoutGrid,
  User,
  LogOut,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

const drawerLinkClass =
  "block py-3 text-lg font-medium text-slate-800 border-b border-slate-100 hover:text-sky-700 transition-colors";

export function Navbar() {
  const pathname = usePathname();
  const { t, locale } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((state) => state.items);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const isSpanish = locale === "es";

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  const openCart = () => openDrawer();
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const accountHref =
    currentUser?.profile.role === "admin" ? "/admin" : "/dashboard";
  const ordersHref =
    currentUser?.profile.role === "admin"
      ? "/admin"
      : currentUser
        ? "/dashboard/orders"
        : "/login";

  const mobileDrawer =
    isMounted &&
    typeof document !== "undefined" &&
    document.body &&
    createPortal(
      <div className="md:hidden" aria-hidden={!isMobileMenuOpen}>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
            isMobileMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onClick={closeMobileMenu}
        />

        {/* Right slide-over panel */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className={`fixed top-0 right-0 bottom-0 w-[85vw] max-w-sm bg-white z-[70] p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out overflow-y-auto ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "translate-x-full pointer-events-none"
          }`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <Link href="/" onClick={closeMobileMenu} className="inline-flex items-center">
                <Image
                  src={LOGO_SRC}
                  alt="Plastipac USA"
                  width={180}
                  height={48}
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex flex-col">
              <Link href="/" onClick={closeMobileMenu} className={drawerLinkClass}>
                {isSpanish ? "Inicio / Catálogo" : "Home / Catalog"}
              </Link>
              <Link
                href="/products"
                onClick={closeMobileMenu}
                className={drawerLinkClass}
              >
                {t("nav.products")}
              </Link>
              <Link
                href="/products?app=hand"
                onClick={closeMobileMenu}
                className={drawerLinkClass}
              >
                Hand Stretch Film
              </Link>
              <Link
                href="/products?app=machine"
                onClick={closeMobileMenu}
                className={drawerLinkClass}
              >
                Machine / Automatic Film
              </Link>
              <Link
                href={ordersHref}
                onClick={closeMobileMenu}
                className={drawerLinkClass}
              >
                {isSpanish ? "Órdenes y Cotizaciones" : "Orders & Quotes"}
              </Link>

              <p className="pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {isSpanish ? "Políticas Legales" : "Legal Policies"}
              </p>
              <Link
                href="/privacy-policy"
                onClick={closeMobileMenu}
                className={drawerLinkClass}
              >
                {isSpanish ? "Privacidad" : "Privacy Policy"}
              </Link>
              <Link
                href="/terms-of-service"
                onClick={closeMobileMenu}
                className={drawerLinkClass}
              >
                {isSpanish ? "Términos" : "Terms of Service"}
              </Link>
              <Link
                href="/refund-policy"
                onClick={closeMobileMenu}
                className={drawerLinkClass}
              >
                {isSpanish ? "Reembolsos" : "Refund Policy"}
              </Link>
              <Link
                href="/shipping-policy"
                onClick={closeMobileMenu}
                className={`${drawerLinkClass} border-b-0`}
              >
                {isSpanish ? "Envíos" : "Shipping Policy"}
              </Link>
            </nav>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-100 mt-6">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-bold text-slate-600">
                {t("nav.language")}
              </span>
              <LanguageToggle />
            </div>

            {currentUser ? (
              <div className="space-y-2">
                <Link
                  href={accountHref}
                  prefetch={false}
                  onClick={closeMobileMenu}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {currentUser.profile.role === "admin" ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {t("nav.adminPortal")}
                    </>
                  ) : (
                    <>
                      <LayoutGrid className="w-4 h-4" />
                      {t("nav.dashboard")}
                    </>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    closeMobileMenu();
                    await signOut();
                  }}
                  className="w-full rounded-xl border border-rose-200 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  {t("nav.signOut")}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={closeMobileMenu}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <User className="w-4 h-4" />
                {t("nav.signIn")}
              </Link>
            )}
          </div>
        </aside>
      </div>,
      document.body
    );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Mobile top bar */}
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
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          className="relative z-10 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

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

      {mobileDrawer}
    </header>
  );
}
