"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Menu, ShieldCheck, Users } from "lucide-react";
import type { UserProfile } from "@/actions/auth";
import { AdminSidebar, type AdminTabKey } from "@/components/admin/AdminSidebar";

export function AdminMarketingShell({
  profile,
  title,
  section,
  children,
  actions,
}: {
  profile: UserProfile;
  title: string;
  section: "leads" | "campaigns";
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTabChange = (tab: AdminTabKey) => {
    if (tab === "orders") {
      router.push("/admin/orders");
      return;
    }
    router.push(`/admin?tab=${tab}`);
  };

  const Icon = section === "leads" ? Users : Megaphone;

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
        leadsActive={section === "leads"}
        campaignsActive={section === "campaigns"}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              aria-label="Open admin menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200/80">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <Icon className="w-3.5 h-3.5 text-blue-600" />
              {title}
            </div>
            <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <Link
                href="/admin/leads"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  section === "leads"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Leads
              </Link>
              <Link
                href="/admin/campaigns"
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  section === "campaigns"
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Campaigns
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <Link
              href="/admin"
              className="text-xs font-bold text-slate-600 hover:text-blue-700 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <main className="flex-1 min-w-0 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
