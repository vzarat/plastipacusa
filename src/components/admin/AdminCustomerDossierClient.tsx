"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Menu, ShieldCheck } from "lucide-react";
import { UserProfile } from "@/actions/auth";
import type { CustomerDossier } from "@/actions/customers";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { AdminSidebar, AdminTabKey } from "@/components/admin/AdminSidebar";
import { AdminCustomerDossierView } from "@/components/admin/AdminCustomerDossierView";

interface AdminCustomerDossierClientProps {
  profile: UserProfile;
  dossier: CustomerDossier;
}

export function AdminCustomerDossierClient({
  profile,
  dossier,
}: AdminCustomerDossierClientProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTabChange = (tab: AdminTabKey) => {
    if (tab === "orders") {
      router.push("/admin/orders");
      return;
    }
    if (tab === "customers") {
      router.push("/admin");
      return;
    }
    router.push("/admin");
  };

  return (
    <div className="min-h-screen flex bg-slate-50/80">
      <AdminSidebar
        activeTab="customers"
        onTabChange={handleTabChange}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        profile={profile}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open admin menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Expediente del Cliente
                </p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {dossier.companyName || dossier.fullName}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              Admin
            </span>
            <LanguageToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AdminCustomerDossierView dossier={dossier} />
        </main>
      </div>
    </div>
  );
}
