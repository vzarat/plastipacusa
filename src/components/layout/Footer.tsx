"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Award, Phone, Mail, Truck } from "lucide-react";

const linkItemClass =
  "block text-xs text-slate-600 py-1 hover:text-sky-600 transition-colors";
const sectionTitleClass =
  "text-sm font-semibold text-slate-900 mb-2 md:text-xs md:font-bold md:uppercase md:tracking-wider md:mb-4";

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
      {/* Top Banner / Factory Trust */}
      <div className="border-b border-slate-200/80 bg-white py-4 px-4 md:py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 text-left sm:text-left md:text-left">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-sky-50 border border-sky-100 rounded-xl md:rounded-2xl text-sky-600 shrink-0">
              <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h4 className="text-slate-900 font-semibold text-sm">Industrial High-Tensile Quality</h4>
              <p className="text-[11px] md:text-xs text-slate-500 leading-snug">
                Premium resin extrusion engineered for zero pallet tear-outs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-blue-50 border border-blue-100 rounded-xl md:rounded-2xl text-blue-600 shrink-0">
              <Truck className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h4 className="text-slate-900 font-semibold text-sm">Cross-Border Delivery</h4>
              <p className="text-[11px] md:text-xs text-slate-500 leading-snug">
                Rapid dispatch throughout South Texas & Northern Mexico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-emerald-50 border border-emerald-100 rounded-xl md:rounded-2xl text-emerald-600 shrink-0">
              <Award className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h4 className="text-slate-900 font-semibold text-sm">Direct Factory Pricing</h4>
              <p className="text-[11px] md:text-xs text-slate-500 leading-snug">
                Full pallet and truckload volume discount tiers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto py-6 px-4 md:py-12 sm:px-6 lg:px-8">
        {/* Brand strip — compact on mobile */}
        <div className="mb-4 md:mb-8 space-y-2 md:space-y-4 lg:hidden">
          <Link href="/" className="inline-block">
            <Image
              src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
              alt="Plastipac USA - Industrial Packaging"
              width={140}
              height={36}
              className="h-7 md:h-9 w-auto object-contain"
            />
          </Link>
          <p className="text-[11px] md:text-xs leading-relaxed text-slate-500 line-clamp-2 md:line-clamp-none">
            High-performance cast stretch films for South Texas & Northern Mexico logistics.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6 lg:grid-cols-5 md:gap-8">
          {/* Company Info — desktop only in grid */}
          <div className="hidden lg:block space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
                alt="Plastipac USA - Industrial Packaging"
                width={160}
                height={42}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-xs leading-relaxed text-slate-500">
              Plastipac USA is a leading industrial manufacturer of high-performance cast stretch films and automated packaging containment solutions for regional logistics and cross-border manufacturing.
            </p>
            <div className="pt-2 text-xs space-y-1.5 text-slate-700 font-medium">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sky-600" />
                <a href="tel:+19564003683" className="hover:text-sky-600 transition-colors">
                  (956) 400 36 83
                </a>
                <span className="text-slate-300">/</span>
                <a href="tel:+19564006563" className="hover:text-sky-600 transition-colors">
                  (956) 400 65 63
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-sky-600" />
                <a href="mailto:sales@plastipacusa.com" className="hover:text-sky-600 transition-colors">
                  sales@plastipacusa.com
                </a>
              </div>
            </div>
          </div>

          {/* Product Lines */}
          <div>
            <h3 className={sectionTitleClass}>Packaging Solutions</h3>
            <ul className="space-y-0 md:space-y-2.5">
              <li>
                <Link href="/products/stretch-film-18-x-50-ga-x-1000ft" className={`${linkItemClass} font-medium text-slate-800`}>
                  18&quot; × 50 GA FORCE
                </Link>
              </li>
              <li>
                <Link href="/products/stretch-film-18-x-60-ga-x-1000ft" className={`${linkItemClass} font-medium text-slate-800`}>
                  18&quot; × 60 GA FORCE
                </Link>
              </li>
              <li>
                <Link href="/products" className={linkItemClass}>
                  Hand Wrap Catalog
                </Link>
              </li>
              <li>
                <Link href="/products" className={linkItemClass}>
                  Specs Matrix
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h3 className={sectionTitleClass}>Company & Support</h3>
            <ul className="space-y-0 md:space-y-2.5">
              <li>
                <Link href="/our-mission" className={`${linkItemClass} font-semibold text-sky-700`}>
                  Mission & Vision
                </Link>
              </li>
              <li>
                <Link href="/about" className={linkItemClass}>
                  About Plastipac
                </Link>
              </li>
              <li>
                <Link href="/#quote-section" className={linkItemClass}>
                  Request Quote
                </Link>
              </li>
              <li>
                <a href="tel:+19564003683" className={linkItemClass}>
                  Sales Desk
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h3 className={sectionTitleClass}>Legal & Policies</h3>
            <ul className="space-y-0 md:space-y-2.5">
              <li>
                <Link href="/privacy-policy" className={linkItemClass}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className={linkItemClass}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className={linkItemClass}>
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className={linkItemClass}>
                  Shipping Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact / Quick Info */}
          <div className="col-span-2 sm:col-span-1">
            <h3 className={sectionTitleClass}>Commercial Desk</h3>
            <p className="hidden md:block text-xs text-slate-500 mb-3 leading-relaxed">
              Serving industrial facilities, warehouses, and freight distributors throughout South Texas and Northern Mexico.
            </p>
            <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white border border-slate-200/80 space-y-1 md:space-y-2 text-xs">
              <span className="font-semibold text-slate-900 block text-sm md:text-xs md:font-bold">
                Fast Order Dispatch
              </span>
              <div className="text-slate-600 space-y-0.5 md:space-y-1">
                <a href="tel:+19564003683" className="block hover:text-sky-600">
                  (956) 400-3683
                </a>
                <a href="tel:+19564006563" className="block hover:text-sky-600">
                  (956) 400-6563
                </a>
                <a
                  href="mailto:sales@plastipacusa.com"
                  className="block font-medium text-sky-700 hover:underline"
                >
                  sales@plastipacusa.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright + contact/legal inline on mobile */}
        <div className="mt-6 pt-4 md:mt-12 md:pt-8 border-t border-slate-200 flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between text-xs text-slate-400">
          <p className="text-[11px] md:text-xs text-center md:text-left">
            © {new Date().getFullYear()} Plastipac USA. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3 gap-y-1 text-[11px] md:text-xs">
            <a
              href="mailto:sales@plastipacusa.com"
              className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-sky-600"
            >
              <Mail className="w-3 h-3 text-sky-600" />
              sales@plastipacusa.com
            </a>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <Link href="/privacy-policy" className="hover:text-slate-600">
              Privacy
            </Link>
            <Link href="/terms-of-service" className="hover:text-slate-600">
              Terms
            </Link>
            <Link href="/refund-policy" className="hover:text-slate-600">
              Refunds
            </Link>
            <Link href="/shipping-policy" className="hover:text-slate-600">
              Shipping
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
