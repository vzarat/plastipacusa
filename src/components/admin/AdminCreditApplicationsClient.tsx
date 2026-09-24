"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Menu, ShieldCheck } from "lucide-react";
import { UserProfile } from "@/actions/auth";
import type { AdminCreditApplication } from "@/actions/credit-applications";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { AdminSidebar, AdminTabKey } from "@/components/admin/AdminSidebar";
import { AdminCreditApplicationsView } from "@/components/admin/AdminCreditApplicationsView";

interface AdminCreditApplicationsClientProps {
  profile: UserProfile;
  initialApplications: AdminCreditApplication[];
}

export function AdminCreditApplicationsClient({
  profile,
  initialApplications,
}: AdminCreditApplicationsClientProps) {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleTabChange = (tab: AdminTabKey) => {
    if (tab === "orders") {
      router.push("/admin/orders");
      return;
    }
    router.push("/admin");
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
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
        creditApplicationsActive
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
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Credit Applications
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link
              href="/admin"
              className="text-xs font-bold text-slate-600 hover:text-blue-700 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <AdminCreditApplicationsView
            initialApplications={initialApplications}
          />
        </main>
      </div>
    </div>
  );
}
