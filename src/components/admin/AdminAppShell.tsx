"use client";

import React, { useTransition } from "react";
import type { UserProfile } from "@/actions/auth";
import { AdminSidebar, type AdminTabKey } from "@/components/admin/AdminSidebar";
import { AdminNavProvider, useAdminNav } from "@/components/admin/AdminNavContext";

function AdminAppShellInner({
  profile,
  children,
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  const {
    dashboardTab,
    setDashboardTab,
    isDashboardHome,
    isMobileSidebarOpen,
    setMobileSidebarOpen,
  } = useAdminNav();
  const [, startTransition] = useTransition();

  const handleTabChange = (tab: AdminTabKey) => {
    startTransition(() => setDashboardTab(tab));
  };

  return (
    <div className="min-h-screen flex bg-slate-50/80 text-slate-900 antialiased font-sans">
      <AdminSidebar
        activeTab={isDashboardHome ? dashboardTab : "overview"}
        onTabChange={handleTabChange}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        profile={profile}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">{children}</div>
    </div>
  );
}

export function AdminAppShell({
  profile,
  children,
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  return (
    <AdminNavProvider>
      <AdminAppShellInner profile={profile}>{children}</AdminAppShellInner>
    </AdminNavProvider>
  );
}
