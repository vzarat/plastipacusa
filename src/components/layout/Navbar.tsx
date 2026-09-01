"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/lib/store/useCartStore";
import {
  ShoppingCart,
  Menu,
  X,
  FileText,
  ChevronDown,
  Hand,
  Cpu,
  ArrowRight,
  Phone,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [isMobileProductsOpen, setIsMobileProductsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((state) => state.items);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Click outside listener for Products dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductsDropdownOpen(false);
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
              {/* Home */}
              <Link
                href="/"
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${
                  pathname === "/"
                    ? "text-sky-700 bg-sky-50/80"
                    : "text-slate-600 hover:text-sky-600 hover:bg-sky-50/50"
                }`}
              >
                Home
              </Link>

              {/* Products Interactive Dropdown */}
              <div
                ref={dropdownRef}
                className="relative"
                onMouseEnter={() => setIsProductsDropdownOpen(true)}
                onMouseLeave={() => setIsProductsDropdownOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsProductsDropdownOpen(!isProductsDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${
                    pathname.startsWith("/products") || isProductsDropdownOpen
                      ? "text-sky-700 bg-sky-50/80"
                      : "text-slate-600 hover:text-sky-600 hover:bg-sky-50/50"
                  }`}
                  aria-expanded={isProductsDropdownOpen}
                >
                  <span>Products</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isProductsDropdownOpen ? "rotate-180 text-sky-600" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isProductsDropdownOpen && (
                  <div className="absolute top-full left-0 w-72 pt-2 z-50 animate-fade-in-up">
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-200/60 space-y-1">
                      {/* Force Hand Stretch Film */}
                      <Link
                        href="/products/force-hand-stretch-film"
                        onClick={() => setIsProductsDropdownOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-sky-50/80 transition-colors group/item"
                      >
                        <div className="p-2 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 group-hover/item:bg-sky-600 group-hover/item:text-white transition-colors">
                          <Hand className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 group-hover/item:text-sky-700 block">
                            Force™ Hand Stretch Film
                          </span>
                          <span className="text-[11px] text-slate-500">
                            12", 15", 18" manual cast rolls (60-80 Ga)
                          </span>
                        </div>
                      </Link>

                      <div className="my-1 border-t border-slate-100" />

                      {/* View Full Catalog */}
                      <Link
                        href="/products"
                        onClick={() => setIsProductsDropdownOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-sky-50 text-slate-700 hover:text-sky-700 transition-colors text-xs font-bold"
                      >
                        <span className="flex items-center gap-2">
                          <LayoutGrid className="w-3.5 h-3.5 text-sky-600" />
                          Dimensions & Pricing Matrix
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Our Mission */}
              <Link
                href="/our-mission"
                className={`px-3.5 py-2 text-sm font-semibold rounded-xl transition-all ${
                  pathname === "/our-mission"
                    ? "text-sky-700 bg-sky-50/80"
                    : "text-slate-600 hover:text-sky-600 hover:bg-sky-50/50"
                }`}
              >
                Our Mission
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
                About Us
              </Link>
            </nav>
          </div>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            {/* Request Quote Button */}
            <Link
              href="/#inquiry-form"
              className="hidden sm:inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 text-white hover:opacity-95 transition-all shadow-md shadow-sky-500/20"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Request Quote</span>
            </Link>

            {/* Cart / Quote Trigger */}
            <Button
              variant="outline"
              size="default"
              onClick={openDrawer}
              className="relative flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-sky-300 text-slate-800 rounded-xl shadow-sm px-3.5"
              aria-label="View Cart and Quote Request"
            >
              <ShoppingCart className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline text-xs font-semibold">Cart / Quote</span>
              {totalItemsCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-1.5 text-[11px] font-bold text-white shadow-sm">
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
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 text-sm font-semibold rounded-xl ${
                pathname === "/"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Home
            </Link>

            {/* Collapsible Mobile Products Section */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2 space-y-1">
              <button
                type="button"
                onClick={() => setIsMobileProductsOpen(!isMobileProductsOpen)}
                className="w-full flex items-center justify-between px-2.5 py-2 text-sm font-bold text-slate-800"
              >
                <span>Packaging Products</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform ${
                    isMobileProductsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isMobileProductsOpen && (
                <div className="pt-1 pl-2 space-y-1 border-t border-slate-200/60">
                  <Link
                    href="/products/force-hand-stretch-film"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:text-sky-600 rounded-lg"
                  >
                    <Hand className="w-3.5 h-3.5 text-sky-600" />
                    Force™ Hand Stretch Film
                  </Link>
                  <Link
                    href="/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-sky-700 hover:text-sky-800 rounded-lg"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Dimensions & Pricing Matrix
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/our-mission"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3.5 py-2.5 text-sm font-semibold rounded-xl ${
                pathname === "/our-mission"
                  ? "bg-sky-50 text-sky-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Our Mission & Vision
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
              About Us
            </Link>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Direct Sales Hotline:
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

            <Link
              href="/#inquiry-form"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block w-full py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 rounded-xl text-center shadow-md shadow-sky-500/20"
            >
              Request Commercial Quote
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
