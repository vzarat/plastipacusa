"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, ShieldCheck, Warehouse } from "lucide-react";
import type { UserProfile } from "@/actions/auth";
import { AdminSidebar, type AdminTabKey } from "@/components/admin/AdminSidebar";

export function AdminInventoryShell({
  profile,
  children,
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [, startTransition] = useTransition();
  const isSupervisor = profile.role === "warehouse_supervisor";

  const handleTabChange = (tab: AdminTabKey) => {
    if (isSupervisor) {
      startTransition(() => router.push("/admin/inventory/usa"));
      return;
    }
    startTransition(() => {
      if (tab === "orders") {
        router.push("/admin/orders");
        return;
      }
      router.push(`/admin?tab=${tab}`);
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50/80">
      <AdminSidebar
        activeTab="overview"
        onTabChange={handleTabChange}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        profile={profile}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              aria-label="Open admin menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <Warehouse className="w-3.5 h-3.5 text-emerald-600" />
              USA · Stretch tarimas
            </div>
          </div>
          {!isSupervisor ? (
            <Link
              href="/admin"
              prefetch
              className="text-xs font-bold text-slate-600 hover:text-blue-700 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            >
              Dashboard
            </Link>
          ) : null}
        </header>

        <main className="flex-1 min-w-0 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
