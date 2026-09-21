import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock3, Globe, Lock, Mail, Phone, CreditCard } from "lucide-react";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

const linkClass =
  "text-sm text-slate-600 hover:text-sky-700 transition-colors";

const PRODUCT_LINE_LINKS = [
  {
    label: "FORCE Hand Stretch Film Standard",
    href: "/products?category=force-standard",
  },
  {
    label: "FORCE Hand Stretch Film Elite",
    href: "/products?category=force-elite",
  },
  {
    label: "GENESIS Automatic Stretch Film Standard",
    href: "/products?category=genesis-standard",
  },
  {
    label: "GENESIS Automatic Stretch Film High Performance",
    href: "/products?category=genesis-high-performance",
  },
] as const;

function PaymentBadge({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex h-8 min-w-[46px] items-center justify-center rounded-md border border-slate-200 bg-white px-2 shadow-sm"
      title={label}
      aria-label={label}
    >
      {children}
    </span>
  );
}

function VisaMark() {
  return (
    <svg viewBox="0 0 48 16" className="h-3.5 w-9" aria-hidden="true">
      <text
        x="0"
        y="13"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="12"
        fontWeight="800"
        fill="#1A1F71"
        letterSpacing="0.5"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardMark() {
  return (
    <svg viewBox="0 0 36 22" className="h-4 w-7" aria-hidden="true">
      <circle cx="13" cy="11" r="8" fill="#EB001B" />
      <circle cx="23" cy="11" r="8" fill="#F79E1B" />
      <path
        d="M18 5.2a8 8 0 0 1 0 11.6 8 8 0 0 1 0-11.6z"
        fill="#FF5F00"
      />
    </svg>
  );
}

function AmexMark() {
  return (
    <svg viewBox="0 0 52 16" className="h-3.5 w-10" aria-hidden="true">
      <rect width="52" height="16" rx="2" fill="#2E77BC" />
      <text
        x="26"
        y="11.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7"
        fontWeight="800"
        fill="#FFFFFF"
        letterSpacing="0.4"
      >
        AMEX
      </text>
    </svg>
  );
}

function DiscoverMark() {
  return (
    <svg viewBox="0 0 56 16" className="h-3.5 w-11" aria-hidden="true">
      <text
        x="0"
        y="12"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="9"
        fontWeight="800"
        fill="#FF6000"
        letterSpacing="0.2"
      >
        DISCOVER
      </text>
    </svg>
  );
}

export function Footer() {
  const year = 2026;

  return (
    <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Column 1 — Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <Image
                src={LOGO_SRC}
                alt="Plastipac USA"
                width={180}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-sm leading-relaxed text-slate-600 max-w-sm">
              Expert manufacturer and distributor of high-yield GENESIS & FORCE
              stretch film systems across North America.
            </p>
            <a
              href="https://www.plastipacusa.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 hover:text-sky-800"
            >
              <Globe className="h-3.5 w-3.5" />
              www.plastipacusa.com
            </a>
          </div>

          {/* Column 2 — Quick Links + B2B Credit */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/products" className={linkClass}>
                  Products
                </Link>
              </li>
              <li>
                <Link href="/#categories" className={linkClass}>
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/about" className={linkClass}>
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/free-sample"
                  className={`${linkClass} font-semibold text-sky-700`}
                >
                  Request Free Sample
                </Link>
              </li>
            </ul>
            <Link
              href="/credit-application"
              className="border border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-xs font-semibold py-2 px-3 rounded-md inline-block my-2"
            >
              Apply for B2B Credit (Net 30) →
            </Link>
          </div>

          {/* Column 3 — Product Lines (text only) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              Product Lines / Categories
            </h3>
            <ul className="space-y-2.5">
              {PRODUCT_LINE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Contact & Support */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              Contact & Support
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                <a
                  href="tel:+19564003683"
                  className="font-semibold text-slate-800 hover:text-sky-700"
                >
                  (956) 400-3683
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <a
                    href="mailto:sales@plastipacusa.com"
                    className="block text-slate-700 hover:text-sky-700"
                  >
                    sales@plastipacusa.com
                  </a>
                  <a
                    href="mailto:payables@plastipacusa.com"
                    className="block text-slate-700 hover:text-sky-700"
                  >
                    payables@plastipacusa.com
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock3 className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800">USA Business Hours</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    Mon–Fri · 8:00 AM – 5:00 PM CST
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-slate-500 text-center sm:text-left">
            <p>© {year} Plastipac USA. All rights reserved.</p>
            <span className="hidden sm:inline text-slate-300" aria-hidden>
              |
            </span>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Link href="/terms-of-service" className="hover:text-slate-700">
                Terms of Service
              </Link>
              <Link href="/privacy-policy" className="hover:text-slate-700">
                Privacy Policy
              </Link>
            </div>
          </div>

          <div
            className="flex flex-wrap items-center justify-center lg:justify-end gap-2"
            aria-label="Accepted payment methods"
          >
            <PaymentBadge label="Visa">
              <VisaMark />
            </PaymentBadge>
            <PaymentBadge label="Mastercard">
              <MastercardMark />
            </PaymentBadge>
            <PaymentBadge label="American Express">
              <AmexMark />
            </PaymentBadge>
            <PaymentBadge label="Discover">
              <DiscoverMark />
            </PaymentBadge>
            <PaymentBadge label="Secure SSL / Stripe Checkout">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700">
                <Lock className="h-3 w-3 text-emerald-600" />
                Stripe
                <CreditCard className="h-3 w-3 text-slate-500" />
              </span>
            </PaymentBadge>
          </div>
        </div>
      </div>
    </footer>
  );
}
