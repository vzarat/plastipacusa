"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldCheck, Wrench } from "lucide-react";
import type { UserProfile } from "@/actions/auth";
import { AdminSidebar, type AdminTabKey } from "@/components/admin/AdminSidebar";
import { BRAND_GRADIENT_PILL_ACTIVE } from "@/lib/brand-styles";
import { ADMIN_TOOLS, adminToolFromPath } from "@/lib/admin-tools";

export function AdminToolsShell({
  profile,
  children,
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTool = adminToolFromPath(pathname);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isNavigating, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch("/admin");
    router.prefetch("/admin?tab=overview");
    router.prefetch("/admin/orders");
    for (const tool of ADMIN_TOOLS) {
      router.prefetch(tool.href);
    }
  }, [router]);

  const handleTabChange = (tab: AdminTabKey) => {
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
        toolsActive
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
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
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                Tools
              </div>
              {isNavigating ? (
                <span className="text-[11px] font-semibold text-slate-400">Loading…</span>
              ) : null}
            </div>
            <Link
              href="/admin"
              prefetch
              className="text-xs font-bold text-slate-600 hover:text-blue-700 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>

          <nav
            className="px-4 sm:px-6 pb-3 flex items-center gap-2 overflow-x-auto"
            aria-label="Admin tools"
          >
            {ADMIN_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.key;
              return (
                <Link
                  key={tool.key}
                  href={tool.href}
                  prefetch
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors ${
                    isActive
                      ? BRAND_GRADIENT_PILL_ACTIVE
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                  title={tool.description}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tool.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 min-w-0 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
