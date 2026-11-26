"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Warehouse } from "lucide-react";
import type { UserProfile } from "@/actions/auth";
import { useAdminNav } from "@/components/admin/AdminNavContext";
import {
  WarehouseLangSwitch,
  useWarehouseLang,
} from "@/components/admin/inventory/WarehouseLangContext";

/** Content chrome only — left sidebar is AdminAppShell. */
export function AdminInventoryShell({
  profile,
  children,
  badgeLabel,
}: {
  profile: UserProfile;
  children: React.ReactNode;
  badgeLabel?: string;
}) {
  const isSupervisor = profile.role === "warehouse_supervisor";
  const { setMobileSidebarOpen } = useAdminNav();
  const { t } = useWarehouseLang();
  const resolvedBadge =
    badgeLabel || t("USA · Tarimas stretch", "USA · Stretch pallets");

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer text-xs font-bold"
            aria-label={t("Abrir menú admin", "Open admin menu")}
          >
            {t("Menú", "Menu")}
          </button>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/80">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <Warehouse className="w-3.5 h-3.5 text-emerald-600" />
            {resolvedBadge}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WarehouseLangSwitch />
          {!isSupervisor ? (
            <Link
              href="/admin"
              prefetch
              className="text-xs font-bold text-slate-600 hover:text-blue-700 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            >
              {t("Panel", "Dashboard")}
            </Link>
          ) : null}
        </div>
      </header>

      <main className="flex-1 min-w-0 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
}
