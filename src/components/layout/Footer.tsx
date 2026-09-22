"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock3, Lock, Mail, MessageCircle, Phone, CreditCard } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

const linkClass =
  "text-sm text-slate-600 hover:text-sky-700 transition-colors";

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M14 13.5h2.5l.5-3H14V8.75c0-.88.18-1.25 1.34-1.25H17V4.5h-2.6C11.9 4.5 11 6.24 11 8.48V10.5H8.5v3H11V20h3v-6.5z" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.94 6.5A1.94 1.94 0 1 1 5 4.56 1.94 1.94 0 0 1 6.94 6.5zM5.5 8.75h2.88V20H5.5zm5.12 0h2.76v1.54h.04c.38-.73 1.32-1.5 2.72-1.5 2.91 0 3.45 1.91 3.45 4.4V20h-2.88v-6.06c0-1.44-.03-3.3-2.01-3.3-2.01 0-2.32 1.57-2.32 3.19V20H10.62z" />
    </svg>
  );
}

const PRODUCT_LINE_LINKS = [
  {
    labelKey: "footer.lineForceStandard" as const,
    href: "/products?category=force-standard",
  },
  {
    labelKey: "footer.lineForceElite" as const,
    href: "/products?category=force-elite",
  },
  {
    labelKey: "footer.lineGenesisStandard" as const,
    href: "/products?category=genesis-standard",
  },
  {
    labelKey: "footer.lineGenesisHp" as const,
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
  const { t } = useLanguage();
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
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-2.5 text-slate-600">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 hover:text-sky-700 hover:border-sky-300 transition-colors"
                aria-label="Facebook"
              >
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 hover:text-sky-700 hover:border-sky-300 transition-colors"
                aria-label="LinkedIn"
              >
                <LinkedinIcon className="w-4 h-4" />
              </a>
              <a
                href="mailto:info@plastipacusa.com"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 hover:text-sky-700 hover:border-sky-300 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="https://wa.me/19564003683"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 hover:text-sky-700 hover:border-sky-300 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2 — Quick Links + B2B Credit */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              {t("footer.quickLinks")}
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/products" className={linkClass}>
                  {t("footer.products")}
                </Link>
              </li>
              <li>
                <Link href="/#categories" className={linkClass}>
                  {t("footer.categories")}
                </Link>
              </li>
              <li>
                <Link href="/about" className={linkClass}>
                  {t("footer.about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/free-sample"
                  className={`${linkClass} font-semibold text-sky-700`}
                >
                  {t("footer.freeSample")}
                </Link>
              </li>
            </ul>
            <Link
              href="/credit-application"
              className="border border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white transition-all text-xs font-semibold py-2 px-3 rounded-md inline-block my-2"
            >
              {t("footer.creditCta")}
            </Link>
          </div>

          {/* Column 3 — Product Categories (text only) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              {t("footer.productCategories")}
            </h3>
            <ul className="space-y-2.5">
              {PRODUCT_LINE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={linkClass}>
                    {t(item.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Contact & Support */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">
              {t("footer.contactSupport")}
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
                  <p className="font-semibold text-slate-800">
                    {t("footer.businessHours")}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    {t("footer.hoursDetail")}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-slate-500 text-center sm:text-left">
            <p>{t("footer.rights").replace("{year}", String(year))}</p>
            <span className="hidden sm:inline text-slate-300" aria-hidden>
              |
            </span>
            <div className="flex items-center justify-center sm:justify-start gap-3">
              <Link href="/terms-of-service" className="hover:text-slate-700">
                {t("footer.terms")}
              </Link>
              <Link href="/privacy-policy" className="hover:text-slate-700">
                {t("footer.privacy")}
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
