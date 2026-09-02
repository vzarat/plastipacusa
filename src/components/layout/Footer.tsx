"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Award, MapPin, Phone, Mail, ArrowRight, Truck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
      {/* Top Banner / Factory Trust */}
      <div className="border-b border-slate-200/80 bg-white py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 bg-sky-50 border border-sky-100 rounded-2xl text-sky-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-slate-900 font-bold text-sm">Industrial High-Tensile Quality</h4>
              <p className="text-xs text-slate-500">Premium resin extrusion engineered for zero pallet tear-outs</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-slate-900 font-bold text-sm">Cross-Border Delivery</h4>
              <p className="text-xs text-slate-500">Rapid dispatch throughout South Texas & Northern Mexico</p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-slate-900 font-bold text-sm">Direct Factory Pricing</h4>
              <p className="text-xs text-slate-500">Full pallet and truckload volume discount tiers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
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
                <a href="mailto:contact@plastipacusa.com" className="hover:text-sky-600 transition-colors">
                  contact@plastipacusa.com
                </a>
              </div>
            </div>
          </div>

          {/* Product Lines */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Packaging Solutions
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/products/stretch-film-18-x-50-ga-x-1000ft" className="hover:text-sky-600 transition-colors font-medium text-slate-900">
                  STRETCH FILM 18" X 50 GA (FORCE Standard)
                </Link>
              </li>
              <li>
                <Link href="/products/stretch-film-18-x-60-ga-x-1000ft" className="hover:text-sky-600 transition-colors font-medium text-slate-900">
                  STRETCH FILM 18" X 60 GA (FORCE Standard)
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-sky-600 transition-colors">
                  18" Industrial Hand Wrap (50-60 Ga)
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-sky-600 transition-colors">
                  Full Technical Dimensions Matrix
                </Link>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Company & Support
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/our-mission" className="hover:text-sky-600 transition-colors font-semibold text-sky-700">
                  Our Mission & Vision
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-sky-600 transition-colors">
                  About Plastipac USA
                </Link>
              </li>
              <li>
                <Link href="/#quote-section" className="hover:text-sky-600 transition-colors">
                  Request Wholesale B2B Quote
                </Link>
              </li>
              <li>
                <Link href="/our-mission" className="hover:text-sky-600 transition-colors">
                  Core Values & Quality
                </Link>
              </li>
              <li>
                <a href="tel:+19564003683" className="hover:text-sky-600 transition-colors">
                  Direct Sales Desk
                </a>
              </li>
            </ul>
          </div>

          {/* Contact / Quick Info */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Regional Commercial Desk
            </h3>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Serving industrial facilities, warehouses, and freight distributors throughout South Texas and Northern Mexico.
            </p>
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2 text-xs">
              <span className="font-bold text-slate-900 block">Fast Order Dispatch:</span>
              <div className="text-slate-600 space-y-1">
                <div>Phone: (956) 400-3683</div>
                <div>Phone: (956) 400-6563</div>
                <div>Email: contact@plastipacusa.com</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Plastipac USA. All rights reserved. Industrial packaging engineered for excellence.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/our-mission" className="hover:text-slate-600">Our Mission</Link>
            <Link href="/products" className="hover:text-slate-600">Product Matrix</Link>
            <Link href="/about" className="hover:text-slate-600">About Us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
