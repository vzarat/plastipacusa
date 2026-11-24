"use client";

import React, { useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, Wrench } from "lucide-react";
import { BRAND_GRADIENT_PILL_ACTIVE } from "@/lib/brand-styles";
import { ADMIN_TOOLS, adminToolFromPath } from "@/lib/admin-tools";
import { useAdminNav } from "@/components/admin/AdminNavContext";

/** Tools sub-header only — left sidebar comes from AdminAppShell layout. */
export function AdminToolsShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const activeTool = adminToolFromPath(pathname);
  const { setMobileSidebarOpen } = useAdminNav();
  const [isNavigating, startTransition] = useTransition();

  useEffect(() => {
    for (const tool of ADMIN_TOOLS) {
      router.prefetch(tool.href);
    }
    router.prefetch("/admin");
  }, [router]);

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200/80">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
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
            onClick={(event) => {
              event.preventDefault();
              startTransition(() => router.push("/admin"));
            }}
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
                onClick={(event) => {
                  if (isActive) {
                    event.preventDefault();
                    return;
                  }
                  startTransition(() => {
                    // let Next handle Link navigation; mark pending for label
                  });
                }}
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
  );
}
