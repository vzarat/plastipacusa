"use client";

import React from "react";
import { FolderOpen, ShieldCheck } from "lucide-react";
import type { UserProfile } from "@/actions/auth";
import type { CustomerDossier } from "@/actions/customers";
import { AdminCustomerDossierView } from "@/components/admin/AdminCustomerDossierView";
import { useAdminNav } from "@/components/admin/AdminNavContext";

export function AdminCustomerDossierClient({
  profile,
  dossier,
}: {
  profile: UserProfile;
  dossier: CustomerDossier;
}) {
  const { setMobileSidebarOpen } = useAdminNav();

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open admin menu"
          >
            Menu
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Customer file
              </p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {dossier.companyName || dossier.fullName}
              </p>
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </span>
      </header>

      <main className="flex-1 min-w-0 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <AdminCustomerDossierView dossier={dossier} currentAdminId={profile.id} />
      </main>
    </div>
  );
}
