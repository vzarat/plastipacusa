"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AdminTabKey } from "@/components/admin/AdminSidebar";

const VALID_TABS: AdminTabKey[] = [
  "overview",
  "orders",
  "products",
  "customers",
  "settings",
];

type AdminNavContextValue = {
  dashboardTab: AdminTabKey;
  setDashboardTab: (tab: AdminTabKey) => void;
  isDashboardHome: boolean;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
};

const AdminNavContext = createContext<AdminNavContextValue | null>(null);

function tabFromSearch(): AdminTabKey {
  if (typeof window === "undefined") return "overview";
  const raw = new URLSearchParams(window.location.search).get("tab");
  if (raw && VALID_TABS.includes(raw as AdminTabKey)) return raw as AdminTabKey;
  return "overview";
}

export function AdminNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboardHome = pathname === "/admin" || pathname === "/admin/";
  const [dashboardTab, setDashboardTabState] = useState<AdminTabKey>("overview");
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (isDashboardHome) {
      setDashboardTabState(tabFromSearch());
    }
  }, [isDashboardHome, pathname]);

  const setDashboardTab = useCallback(
    (tab: AdminTabKey) => {
      if (isDashboardHome) {
        setDashboardTabState(tab);
        const url = tab === "overview" ? "/admin" : `/admin?tab=${tab}`;
        window.history.replaceState(window.history.state, "", url);
        setMobileSidebarOpen(false);
        return;
      }
      setMobileSidebarOpen(false);
      router.push(tab === "overview" ? "/admin" : `/admin?tab=${tab}`);
    },
    [isDashboardHome, router]
  );

  const value = useMemo(
    () => ({
      dashboardTab,
      setDashboardTab,
      isDashboardHome,
      isMobileSidebarOpen,
      setMobileSidebarOpen,
    }),
    [dashboardTab, setDashboardTab, isDashboardHome, isMobileSidebarOpen]
  );

  return (
    <AdminNavContext.Provider value={value}>{children}</AdminNavContext.Provider>
  );
}

export function useAdminNav(): AdminNavContextValue {
  const ctx = useContext(AdminNavContext);
  if (!ctx) {
    return {
      dashboardTab: "overview",
      setDashboardTab: () => undefined,
      isDashboardHome: false,
      isMobileSidebarOpen: false,
      setMobileSidebarOpen: () => undefined,
    };
  }
  return ctx;
}
