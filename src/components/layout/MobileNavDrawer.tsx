"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageCircle, PhoneCall, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

const NAV_LINKS = [
  { href: "/", label: "Inicio", id: "home" },
  { href: "/about", label: "Nosotros", id: "about" },
  { href: "/products", label: "Productos", id: "products" },
  { href: "/#categories", label: "Categorías", id: "categories" },
  { href: "/#usa-coverage", label: "Cobertura RGV & Houston", id: "coverage" },
  { href: "/#inquiry-form", label: "Cotización Directa / Contacto", id: "contact" },
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
  if (id === "coverage") return hash === "#usa-coverage";
  if (id === "contact") return hash === "#inquiry-form";
  return false;
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
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
        aria-label="Navegación"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-xs sm:max-w-sm bg-slate-950 border-l border-slate-800 p-6 shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="min-h-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="inline-flex shrink-0 rounded-lg bg-white px-2 py-1">
                <Image
                  src={LOGO_SRC}
                  alt="Plastipac USA"
                  width={96}
                  height={28}
                  className="h-6 w-auto object-contain"
                />
              </span>
              <span className="truncate text-sm font-semibold text-white">Navegación</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
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
                  className={`border-b border-slate-800 text-sm transition-colors hover:bg-slate-800/80 hover:text-white ${
                    active
                      ? "text-sky-400 font-semibold bg-sky-950/30 rounded-lg px-3 py-2"
                      : "rounded-lg px-3 py-2 text-slate-200"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2.5 pt-6">
          <Button asChild variant="gradient" className="h-11 w-full text-sm">
            <Link href="/#inquiry-form" onClick={onClose}>
              Solicitar Cotización de Tarima
            </Link>
          </Button>
          <a
            href="tel:+19564003683"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 text-sm font-semibold text-slate-100 transition-colors hover:border-sky-500 hover:text-sky-300"
          >
            <PhoneCall className="h-4 w-4 text-sky-400" />
            (956) 400-3683
          </a>
          <a
            href="https://wa.me/19564003683"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-700/70 bg-emerald-950/40 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-900/50"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </aside>
    </div>,
    document.body
  );
}
