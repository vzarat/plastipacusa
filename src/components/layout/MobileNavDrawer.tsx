"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Mail, MessageCircle, Phone, X } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/company-email";
import {
  PRIMARY_PHONE_DISPLAY,
  PRIMARY_PHONE_HREF,
  WHATSAPP_PHONE_DISPLAY,
  WHATSAPP_URL_BARE,
} from "@/lib/company-contact";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

const NAV_LINKS = [
  { href: "/", label: "Home", id: "home" },
  { href: "/products", label: "Products", id: "products" },
  { href: "/about", label: "About Us", id: "about" },
  { href: "/#inquiry-form", label: "Contact", id: "contact" },
  { href: "/credit-application", label: "Apply Credit B2B", id: "credit" },
] as const;

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  signedIn?: boolean;
  isAdmin?: boolean;
  onSignOut?: () => void;
}

const linkClass = (active: boolean) =>
  `border-b border-slate-100 text-sm transition-colors hover:bg-slate-100 ${
    active
      ? "rounded-lg bg-sky-50 px-3 py-2 font-semibold text-sky-700"
      : "rounded-lg px-3 py-2 text-slate-800"
  }`;

function isLinkActive(id: string, pathname: string, hash: string) {
  if (id === "home") return pathname === "/" && hash === "";
  if (id === "about") return pathname === "/about";
  if (id === "products") return pathname === "/products" || pathname.startsWith("/products/");
  if (id === "credit") {
    return (
      pathname === "/credit-application" ||
      pathname.startsWith("/credit-application/") ||
      pathname === "/dashboard/credit" ||
      pathname.startsWith("/dashboard/credit/")
    );
  }
  if (id === "contact") return hash === "#inquiry-form";
  return false;
}

export function MobileNavDrawer({
  open,
  onClose,
  signedIn = false,
  isAdmin = false,
  onSignOut,
}: MobileNavDrawerProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={`lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xs sm:max-w-sm bg-white text-slate-900 border-l border-slate-200 p-6 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" onClick={onClose} className="inline-flex shrink-0" aria-label="Plastipac USA Home">
              <Image
                src={LOGO_SRC}
                alt="Plastipac USA"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-800 transition-colors hover:bg-slate-100"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.id, pathname, hash);
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={onClose}
                  className={linkClass(active)}
                >
                  {link.label}
                </Link>
              );
            })}
            {signedIn ? (
              <>
                <Link
                  href={isAdmin ? "/admin" : "/dashboard"}
                  onClick={onClose}
                  className={linkClass(
                    isAdmin
                      ? pathname.startsWith("/admin")
                      : pathname.startsWith("/dashboard")
                  )}
                >
                  {isAdmin ? "Admin" : "Dashboard"}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut?.();
                  }}
                  className="rounded-lg border-b border-slate-100 px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/register"
                onClick={onClose}
                className="mt-3 flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-700 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
              >
                Sign Up
              </Link>
            )}
          </nav>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Questions? We&apos;re here to help.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            onClick={onClose}
            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
          >
            <Mail className="h-4 w-4 shrink-0 text-sky-600" />
            <span className="min-w-0 break-all">{SUPPORT_EMAIL}</span>
          </a>
          <a
            href={PRIMARY_PHONE_HREF}
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
          >
            <Phone className="h-4 w-4 shrink-0 text-sky-600" />
            {PRIMARY_PHONE_DISPLAY}
          </a>
          <a
            href={WHATSAPP_URL_BARE}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              {WHATSAPP_PHONE_DISPLAY}
              <span className="ml-1 text-[11px] font-medium text-slate-500">
                WhatsApp
              </span>
            </span>
          </a>
        </div>
      </aside>
    </div>,
    document.body
  );
}
