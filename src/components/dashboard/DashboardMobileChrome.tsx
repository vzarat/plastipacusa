"use client";

import type { ReactNode } from "react";
import Image from "next/image";

const LOGO_SRC =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

interface DashboardMobileChromeProps {
  welcomeName: string;
  avatarUrl?: string | null;
  avatarInitial: string;
  onAccount: () => void;
  headerAction?: ReactNode;
}

export function DashboardMobileChrome({
  welcomeName,
  avatarUrl,
  avatarInitial,
  onAccount,
  headerAction,
}: DashboardMobileChromeProps) {
  const firstName = welcomeName.trim().split(" ")[0] || "there";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <Image
          src={LOGO_SRC}
          alt="Plastipac USA"
          width={120}
          height={32}
          className="h-7 w-auto shrink-0 object-contain"
        />
        <p className="truncate text-sm font-semibold text-slate-800">
          Welcome, {firstName}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {headerAction}
        <button
          type="button"
          onClick={onAccount}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-bold uppercase text-white touch-manipulation transition-transform active:scale-[0.98]"
          aria-label="Account"
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={36} height={36} className="h-full w-full object-cover" />
          ) : (
            avatarInitial
          )}
        </button>
      </div>
    </header>
  );
}
