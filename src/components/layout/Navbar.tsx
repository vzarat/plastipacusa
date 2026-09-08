"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Hand,
  Cpu,
  ArrowRight,
  Phone,
  LayoutGrid,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";

export function Navbar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [isMobileProductsOpen, setIsMobileProductsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((state) => state.items);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Fetch session on load and route changes
  useEffect(() => {
    let isMounted = true;
    getCurrentUser().then((res) => {
      if (isMounted) setCurrentUser(res);
    });
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductsDropdownOpen(false);
      }
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

  // Close mobile menu on pathname change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProductsDropdownOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">
          {/* Left: Official Brand Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center group py-1.5">
              <Image
                src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
                alt="Plastipac USA - Industrial Stretch Packaging"
                width={240}
                height={65}
                priority
                className="h-12 sm:h-14 lg:h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              />
            </Link>

            {/* Center Navigation Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
              {/* Products */}
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

              {/* Categories */}
              <Link
                href="/#category-showcase"
                className="px-3.5 py-2 text-sm font-semibold rounded-xl transition-all text-slate-600 hover:text-sky-600 hover:bg-sky-50/50"
              >
                {t("nav.categories")}
              </Link>

              {/* About Us */}
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

              {/* Contact (Guest only) */}
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

          {/* Right Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Language Switcher */}
            <LanguageToggle />

            {/* User Session / Sign In Trigger */}
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 bg-slate-50/90 hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-bold text-slate-800 cursor-pointer shadow-xs"
                  aria-label="User Account Menu"
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] uppercase flex-shrink-0">
                    {currentUser.profile.fullName?.charAt(0) || "C"}
                  </div>
                  <span className="hidden sm:inline truncate max-w-[130px]">
                    {currentUser.profile.companyName || currentUser.profile.fullName || t("nav.portal")}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fade-in-up">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.profile.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentUser.profile.companyName || t("nav.portal")}
                      </p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                    >
                      <LayoutGrid className="w-4 h-4 text-slate-400" />
                      <span>{t("nav.dashboard")}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsUserMenuOpen(false);
                        await signOut();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
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

            {/* Cart Trigger */}
            <Button
              variant="outline"
              size="default"
              onClick={openDrawer}
              className={`relative flex items-center justify-center border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-300 text-slate-800 rounded-xl shadow-xs transition-all ${
                currentUser ? "h-10 w-10 p-0" : "gap-2 px-3.5 h-10"
              }`}
              aria-label="View Cart and Quote Request"
            >
              <ShoppingCart className={currentUser ? "w-5 h-5 text-sky-600" : "w-4 h-4 text-sky-600"} />
              {!currentUser && (
                <span className="hidden sm:inline text-xs font-semibold">{t("nav.cart")}</span>
              )}
              {totalItemsCount > 0 && (
                <span
                  className={`flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold shadow-xs ${
                    currentUser
                      ? "absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 text-[10px]"
                      : "h-5 min-w-[20px] px-1.5 text-[11px]"
                  }`}
                >
                  {totalItemsCount}
                </span>
              )}
            </Button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Responsive Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200/80 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl animate-fade-in-up">
          <div className="space-y-1">
            <Link
              href="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 text-sm font-semibold rounded-xl ${
                pathname === "/products"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t("nav.products")}
            </Link>

            <Link
              href="/#category-showcase"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
            >
              {t("nav.categories")}
            </Link>

            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 text-sm font-semibold rounded-xl ${
                pathname === "/about"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {t("nav.about")}
            </Link>

            {/* Contact (Guest only) */}
            {!currentUser && (
              <Link
                href="/#inquiry-form"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-50"
              >
                {t("nav.contact")}
              </Link>
            )}

            {/* Mobile Language Switcher Row */}
            <div className="flex items-center justify-between px-3.5 py-2.5 mt-2 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-xs font-bold text-slate-600">{t("nav.language")}:</span>
              <LanguageToggle />
            </div>
          </div>

          {/* User Account / Auth Actions */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            {currentUser ? (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.profile.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {currentUser.profile.companyName || t("nav.portal")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsMobileMenuOpen(false);
                      await signOut();
                    }}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 font-bold text-xs hover:bg-rose-50 cursor-pointer"
                  >
                    {t("nav.signOut")}
                  </button>
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs shadow-xs"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t("nav.dashboard")}</span>
                </Link>
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

          {/* Quick Contact & Action Buttons */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {t("nav.hotline")}:
              </span>
              <div className="flex items-center justify-between font-bold text-slate-800">
                <a href="tel:+19564003683" className="flex items-center gap-1.5 text-sky-700 hover:underline">
                  <Phone className="w-3.5 h-3.5" /> (956) 400 36 83
                </a>
                <span className="text-slate-300">•</span>
                <a href="tel:+19564006563" className="text-sky-700 hover:underline">
                  (956) 400 65 63
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
