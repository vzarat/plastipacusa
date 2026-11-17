"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import { deleteAdminManagedUser } from "@/actions/admin-users";
import {
  Building2,
  Search,
  CheckCircle2,
  FileCheck,
  FolderOpen,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

export interface CustomerRecord {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  creditTerms: string;
  creditLimit: number;
  creditUsed: number;
  taxExempt: boolean;
  taxId?: string;
  creditApplicationStatus?: "pending" | "approved" | "rejected";
  status: "approved" | "under_review" | "suspended";
  createdAt?: string;
}

interface AdminCustomersViewProps {
  customers?: CustomerRecord[];
  currentAdminId?: string;
}

export function AdminCustomersView({
  customers = [],
  currentAdminId = "",
}: AdminCustomersViewProps) {
  const { t, locale } = useLanguage();
  const isSpanish = locale === "es";
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(customers);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(customers);
  }, [customers]);

  const filtered = rows.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.companyName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === currentAdminId) {
      toast.error(
        isSpanish
          ? "No puedes eliminar tu propia cuenta."
          : "You cannot delete your own account."
      );
      return;
    }
    setBusyId(deleteTarget.id);
    startTransition(async () => {
      const result = await deleteAdminManagedUser(deleteTarget.id);
      setBusyId(null);
      if (!result.success) {
        toast.error(result.error || "Delete failed.");
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success(isSpanish ? "Cuenta eliminada." : "Account deleted.");
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{t("admin.customers")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("admin.customers")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("admin.manageCustomers")}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, or email..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-400"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Building2 className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">No real customers found yet.</p>
            <p className="mt-2 text-xs text-slate-500">
              Customer accounts will appear here once real orders are placed in the system.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Customer</th>
                  <th className="py-3.5 px-3">Primary Contact</th>
                  <th className="py-3.5 px-3">Location</th>
                  <th className="py-3.5 px-3">Credit Terms</th>
                  <th className="py-3.5 px-3">Credit Limit / Used</th>
                  <th className="py-3.5 px-3">Tax Resale Cert</th>
                  <th className="py-3.5 px-3">Approval Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 sm:px-6">
                      <div>
                        <Link
                          href={`/admin/customers/${encodeURIComponent(client.id)}`}
                          prefetch={false}
                          className="font-bold text-slate-900 text-xs hover:text-blue-700 hover:underline"
                        >
                          {client.companyName}
                        </Link>
                        <p className="font-mono text-[10px] text-blue-700 font-semibold">
                          {client.taxId ? `EIN ${client.taxId}` : client.id.slice(0, 8)}
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">{client.contactName}</p>
                        <p className="text-[11px] text-slate-400">{client.email}</p>
                      </div>
                    </td>

                    <td className="py-4 px-3 text-slate-600">
                      {client.city}, {client.state}
                    </td>

                    <td className="py-4 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-[11px]">
                        {client.creditTerms}
                      </span>
                    </td>

                    <td className="py-4 px-3">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 text-xs">
                          {formatCurrency(client.creditLimit)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatCurrency(client.creditUsed)} active balance
                        </p>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      {client.taxExempt ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          Verified Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending Upload
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-3">
                      {client.status === "approved" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Approved Tier
                        </span>
                      ) : client.status === "under_review" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                          Credit Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold">
                          Suspended
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/customers/${encodeURIComponent(client.id)}`}
                          prefetch={false}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-800 shadow-xs hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-colors"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(client)}
                          disabled={
                            client.id === currentAdminId || busyId === client.id
                          }
                          title={
                            client.id === currentAdminId
                              ? isSpanish
                                ? "No puedes eliminar tu propia cuenta"
                                : "You cannot delete your own account"
                              : isSpanish
                                ? "Eliminar cuenta"
                                : "Delete account"
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {isSpanish ? "Eliminar" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {isSpanish ? "Eliminar cuenta" : "Delete account"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {isSpanish
                    ? "Esto borra el login y el perfil. No se puede deshacer."
                    : "This removes their login and profile. This cannot be undone."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              {isSpanish
                ? `¿Eliminar permanentemente a ${deleteTarget.contactName || deleteTarget.companyName || deleteTarget.email}?`
                : `Permanently delete ${deleteTarget.contactName || deleteTarget.companyName || deleteTarget.email}?`}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {isSpanish ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busyId === deleteTarget.id || isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {busyId === deleteTarget.id || isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                {isSpanish ? "Eliminar cuenta" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
