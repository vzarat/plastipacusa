"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

interface DashboardMobileChromeProps {
  menuOpen: boolean;
  onMenu: () => void;
  headerAction?: ReactNode;
}

export function DashboardMobileChrome({
  menuOpen,
  onMenu,
  headerAction,
}: DashboardMobileChromeProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
      <Image
        src={LOGO_SRC}
        alt="Plastipac USA"
        width={120}
        height={32}
        className="h-7 w-auto shrink-0 object-contain"
      />
      <div className="flex shrink-0 items-center gap-1">
        {headerAction}
        <button
          type="button"
          onClick={onMenu}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-800 touch-manipulation transition-transform active:scale-[0.98]"
          aria-label={menuOpen ? "Close dashboard menu" : "Open dashboard menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}
