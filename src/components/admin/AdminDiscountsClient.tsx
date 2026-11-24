"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { UserProfile } from "@/actions/auth";
import { AdminDiscountsView } from "@/components/admin/AdminDiscountsView";
import { useAdminNav } from "@/components/admin/AdminNavContext";

export function AdminDiscountsClient({ profile: _profile }: { profile: UserProfile }) {
  const { setMobileSidebarOpen } = useAdminNav();

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer text-xs font-bold"
            aria-label="Open admin menu"
          >
            Menu
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200/80">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Discounts
          </div>
        </div>
        <Link
          href="/admin"
          className="text-xs font-bold text-slate-600 hover:text-blue-700 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
        >
          Dashboard
        </Link>
      </header>

      <main className="flex-1 min-w-0 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <AdminDiscountsView />
      </main>
    </div>
  );
}
