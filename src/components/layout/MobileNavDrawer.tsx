"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistStore } from "@/lib/store/useAssistStore";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

const NAV_LINKS = [
  { href: "/", label: "Home", id: "home" },
  { href: "/about", label: "About Us", id: "about" },
  { href: "/products", label: "Products", id: "products" },
  { href: "/#categories", label: "Categories", id: "categories" },
  { href: "/#inquiry-form", label: "Contact", id: "contact" },
] as const;

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

function isLinkActive(id: string, pathname: string, hash: string) {
  if (id === "home") return pathname === "/" && hash === "";
  if (id === "about") return pathname === "/about";
  if (id === "products") return pathname === "/products" || pathname.startsWith("/products/");
  if (id === "categories") return hash === "#categories";
  if (id === "contact") return hash === "#inquiry-form";
  return false;
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const openAssist = useAssistStore((state) => state.setOpen);
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
      className={`md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
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
        <div className="min-h-0">
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

          <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map((link) => {
              const active = isLinkActive(link.id, pathname, hash);
              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={onClose}
                  className={`border-b border-slate-100 text-sm text-slate-800 transition-colors hover:bg-slate-100 ${
                    active
                      ? "rounded-lg bg-sky-50 px-3 py-2 font-semibold text-sky-700"
                      : "rounded-lg px-3 py-2"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-3 pt-6">
          <Button asChild variant="gradient" className="h-11 w-full text-sm">
            <Link href="/#inquiry-form" onClick={onClose}>
              Request Quote
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => {
              onClose();
              openAssist(true);
            }}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#085de7] text-sm font-bold text-white shadow-lg shadow-sky-900/25 transition active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Assist AI
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
