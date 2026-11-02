"use client";

import React, { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import {
  Truck,
  ShieldCheck,
  CheckCircle2,
  Save,
  Plug,
  MapPin,
  Loader2,
  Mail,
  Settings2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WarpIntegrationCard } from "@/components/admin/WarpIntegrationCard";
import { ResendEmailUsageCard } from "@/components/admin/ResendEmailUsageCard";
import { AdminEmailTemplatesView } from "@/components/admin/AdminEmailTemplatesView";
import { AdminUsersView } from "@/components/admin/AdminUsersView";
import {
  loadWarehouseOriginForAdmin,
  saveWarehouseOrigin,
} from "@/actions/warehouse-origin";
import type { WarehouseOriginAddress } from "@/lib/shipping/warehouse-origin";

export type AdminSettingsTab =
  | "general"
  | "email-templates"
  | "users"
  | "integrations";

interface AdminSettingsViewProps {
  /** Opens a Settings subsection (e.g. deep-link from /admin/email-templates). */
  initialTab?: AdminSettingsTab;
  currentAdminId: string;
}

const EMPTY_ORIGIN: WarehouseOriginAddress = {
  street: "",
  city: "McAllen",
  state: "TX",
  zip: "",
  dockNotes: "",
};

const inputClass =
  "w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-500";

const SETTINGS_TABS: {
  key: AdminSettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "general", label: "General", icon: Settings2 },
  { key: "email-templates", label: "Email Templates", icon: Mail },
  { key: "users", label: "Users", icon: Users },
  { key: "integrations", label: "Integrations", icon: Plug },
];

export function AdminSettingsView({
  initialTab = "general",
  currentAdminId,
}: AdminSettingsViewProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminSettingsTab>(initialTab);
  const [savedNotice, setSavedNotice] = useState(false);
  const [origin, setOrigin] = useState<WarehouseOriginAddress>(EMPTY_ORIGIN);
  const [originLoading, setOriginLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setOriginLoading(true);
      try {
        const result = await loadWarehouseOriginForAdmin();
        if (!cancelled) setOrigin(result.origin);
      } catch {
        if (!cancelled) {
          toast.error("Could not load warehouse origin.");
        }
      } finally {
        if (!cancelled) setOriginLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateOrigin = <K extends keyof WarehouseOriginAddress>(
    key: K,
    value: WarehouseOriginAddress[K]
  ) => {
    setOrigin((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveWarehouseOrigin(origin);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOrigin(result.origin);
      setSavedNotice(true);
      toast.success("Warehouse pickup origin saved for Warp.");
      setTimeout(() => setSavedNotice(false), 3000);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{t("admin.settings")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("admin.settings")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("admin.manageSettings")}
          </p>
        </div>

        {activeTab === "general" && (
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || originLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Configuration</span>
            </Button>
          </div>
        )}
      </div>

      {/* Settings sub-tabs */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xs"
      >
        {SETTINGS_TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer sm:flex-none sm:px-4 ${
                selected
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {savedNotice && activeTab === "general" && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            Warehouse origin saved. Warp pickup requests will use this address.
          </span>
        </div>
      )}

      {activeTab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Logistics & Dispatch Hubs */}
          <div
            id="warehouse-origin"
            className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4"
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Facility Dispatch Hubs</span>
            </div>

            <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3.5 py-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-900">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                Warehouse Pickup Origin
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Street, city, state, and ZIP map 1:1 to Warp{" "}
                <code className="rounded bg-white/80 px-1 py-0.5 text-[10px] font-semibold text-slate-800">
                  pickupInfo.address
                </code>{" "}
                /{" "}
                <code className="rounded bg-white/80 px-1 py-0.5 text-[10px] font-semibold text-slate-800">
                  origin_*
                </code>{" "}
                fields. Placeholder or marketing labels are rejected.
              </p>
            </div>

            {originLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading warehouse origin…
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label
                    className="font-bold text-slate-700"
                    htmlFor="warehouse-street"
                  >
                    Street Address
                  </label>
                  <input
                    id="warehouse-street"
                    type="text"
                    autoComplete="street-address"
                    value={origin.street}
                    onChange={(e) => updateOrigin("street", e.target.value)}
                    placeholder="5801 George McVay Dr"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_0.6fr_0.8fr] gap-3">
                  <div className="space-y-1">
                    <label
                      className="font-bold text-slate-700"
                      htmlFor="warehouse-city"
                    >
                      City
                    </label>
                    <input
                      id="warehouse-city"
                      type="text"
                      autoComplete="address-level2"
                      value={origin.city}
                      onChange={(e) => updateOrigin("city", e.target.value)}
                      placeholder="McAllen"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="font-bold text-slate-700"
                      htmlFor="warehouse-state"
                    >
                      State
                    </label>
                    <input
                      id="warehouse-state"
                      type="text"
                      autoComplete="address-level1"
                      maxLength={2}
                      value={origin.state}
                      onChange={(e) =>
                        updateOrigin("state", e.target.value.toUpperCase())
                      }
                      placeholder="TX"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="font-bold text-slate-700"
                      htmlFor="warehouse-zip"
                    >
                      ZIP Code
                    </label>
                    <input
                      id="warehouse-zip"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={10}
                      value={origin.zip}
                      onChange={(e) => updateOrigin("zip", e.target.value)}
                      placeholder="78503"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    className="font-bold text-slate-700"
                    htmlFor="warehouse-dock-notes"
                  >
                    Warehouse / Loading Dock Notes
                  </label>
                  <textarea
                    id="warehouse-dock-notes"
                    rows={2}
                    value={origin.dockNotes}
                    onChange={(e) => updateOrigin("dockNotes", e.target.value)}
                    placeholder="Dock 3, Contact: Ops Team"
                    className={`${inputClass} resize-y min-h-[4rem]`}
                  />
                  <p className="text-slate-500 text-[11px]">
                    Kept for pickup scheduling / BOL ops. Not sent as Warp street
                    text.
                  </p>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-100">
                  <label className="font-bold text-slate-700">
                    Daily LTL Linehaul Cutoff Time
                  </label>
                  <input
                    type="text"
                    defaultValue="16:00 CST (Mon - Fri)"
                    className={inputClass}
                  />
                  <p className="text-slate-500 text-[11px]">
                    McAllen warehouse pickup schedule.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    Approved LTL Carriers
                  </label>
                  <p className="text-slate-500 text-[11px]">
                    Warp (primary logistics carrier).
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Commercial Credit & Verification */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Commercial Credit & Tax Exemption</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Default Credit Terms for New Accounts
                </label>
                <select
                  defaultValue="net30"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="prepaid">Prepaid / Credit Card</option>
                  <option value="net30">
                    Net 30 (Upon Credit Application Approval)
                  </option>
                  <option value="net60">
                    Net 60 (Enterprise Volume Contract)
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Resale Tax Certificate Validation
                </label>
                <select
                  defaultValue="manual"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="manual">
                    Manual Admin Audit Before Exemption
                  </option>
                  <option value="auto">Automated Tax ID Verification</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "email-templates" && (
        <div className="space-y-6">
          <ResendEmailUsageCard />
          <AdminEmailTemplatesView embedded />
        </div>
      )}

      {activeTab === "users" && (
        <AdminUsersView currentAdminId={currentAdminId} autoLoad />
      )}

      {activeTab === "integrations" && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Plug className="w-4 h-4 text-blue-600" />
            <span>APIs & Integrations</span>
          </div>
          <WarpIntegrationCard />
        </div>
      )}
    </div>
  );
}
