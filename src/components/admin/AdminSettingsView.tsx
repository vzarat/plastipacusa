"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  Settings,
  Building2,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Bell,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminSettingsView() {
  const { t } = useLanguage();
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
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

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </Button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4" />
          <span>System configurations saved successfully.</span>
        </div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logistics & Dispatch Hubs */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Truck className="w-4 h-4 text-purple-600" />
            <span>Facility Dispatch Hubs</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Primary Cross-Dock Terminal</label>
              <input
                type="text"
                defaultValue="Laredo Commercial Distribution Center, Texas 78045"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Daily LTL Linehaul Cutoff Time</label>
              <input
                type="text"
                defaultValue="16:00 CST (Mon - Fri)"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Approved LTL Carriers</label>
              <p className="text-slate-500 text-[11px]">
                FedEx Freight Priority, R&L Carriers, Old Dominion Freight Line, Estes Express Lines.
              </p>
            </div>
          </div>
        </div>

        {/* Commercial Credit & Verification */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Commercial Credit & Tax Exemption</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Default Credit Terms for New Accounts</label>
              <select
                defaultValue="net30"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="prepaid">Prepaid / Credit Card</option>
                <option value="net30">Net 30 (Upon Credit Application Approval)</option>
                <option value="net60">Net 60 (Enterprise Volume Contract)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Resale Tax Certificate Validation</label>
              <select
                defaultValue="manual"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="manual">Manual Admin Audit Before Exemption</option>
                <option value="auto">Automated Tax ID Verification</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

