"use client";

import React, { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import {
  updateCreditApplicationStatus,
  type AdminCreditApplication,
  type CreditApplicationStatus,
} from "@/actions/credit-applications";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusBadgeClass(status: CreditApplicationStatus): string {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (status === "rejected") {
    return "bg-rose-50 text-rose-800 border-rose-200";
  }
  return "bg-amber-50 text-amber-900 border-amber-200";
}

function statusLabel(status: CreditApplicationStatus): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function requestedTerms(app: AdminCreditApplication): string {
  if (app.annualVolume?.trim()) {
    return `Net 30 · ${app.annualVolume.trim()}`;
  }
  return "Net 30";
}

interface AdminCreditApplicationsViewProps {
  initialApplications: AdminCreditApplication[];
}

export function AdminCreditApplicationsView({
  initialApplications,
}: AdminCreditApplicationsViewProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [selected, setSelected] = useState<AdminCreditApplication | null>(null);
  const [filter, setFilter] = useState<"all" | CreditApplicationStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (filter === "all") return applications;
    return applications.filter((app) => app.status === filter);
  }, [applications, filter]);

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const handleStatusUpdate = (
    id: string,
    status: Extract<CreditApplicationStatus, "approved" | "rejected">
  ) => {
    setBusyId(id);
    startTransition(async () => {
      const result = await updateCreditApplicationStatus(id, status);
      setBusyId(null);

      if (!result.success) {
        toast.error(result.error || "Unable to update application status.");
        return;
      }

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id
            ? {
                ...app,
                status,
                reviewedAt: new Date().toISOString(),
              }
            : app
        )
      );
      setSelected((prev) =>
        prev?.id === id
          ? { ...prev, status, reviewedAt: new Date().toISOString() }
          : prev
      );
      toast.success(
        status === "approved"
          ? "Credit application approved."
          : "Credit application rejected."
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Credit Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review B2B Net 30 credit requests, Tax ID / EIN, and trade references.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              ["all", "All"],
              ["pending", "Pending"],
              ["approved", "Approved"],
              ["rejected", "Rejected"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide border transition-colors cursor-pointer ${
                filter === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
              {key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="px-4 py-3">Company Name</th>
                <th className="px-4 py-3">Contact Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Requested Terms / Volume</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-slate-500"
                  >
                    <div className="inline-flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-medium">
                        No credit applications found.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {app.companyName}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{app.contactName}</td>
                    <td className="px-4 py-3.5">
                      <a
                        href={`mailto:${app.workEmail}`}
                        className="text-blue-700 hover:underline"
                      >
                        {app.workEmail}
                      </a>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {requestedTerms(app)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadgeClass(
                          app.status
                        )}`}
                      >
                        {statusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelected(app)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                        {app.status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={busyId === app.id || isPending}
                              onClick={() =>
                                handleStatusUpdate(app.id, "approved")
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                            >
                              {busyId === app.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyId === app.id || isPending}
                              onClick={() =>
                                handleStatusUpdate(app.id, "rejected")
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close detail drawer"
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] cursor-pointer"
            onClick={() => setSelected(null)}
          />
          <aside className="relative w-full max-w-lg h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in fade-in duration-200">
            <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Credit Application
                </p>
                <h2 className="text-lg font-black text-slate-900 truncate">
                  {selected.companyName}
                </h2>
                <span
                  className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusBadgeClass(
                    selected.status
                  )}`}
                >
                  {statusLabel(selected.status)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Company Details
                </h3>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Legal Name
                      </p>
                      <p className="font-semibold text-slate-900">
                        {selected.companyName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Contact
                      </p>
                      <p className="font-semibold text-slate-900">
                        {selected.contactName}
                      </p>
                      <a
                        href={`mailto:${selected.workEmail}`}
                        className="text-blue-700 hover:underline text-xs"
                      >
                        {selected.workEmail}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        Phone
                      </p>
                      <p className="font-semibold text-slate-900">
                        {selected.phone}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Tax ID / EIN
                    </p>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5">
                      {selected.taxIdEin}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Requested Terms / Volume
                    </p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {requestedTerms(selected)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Submitted
                    </p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {formatDate(selected.createdAt)}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Addresses
                </h3>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                      Billing
                    </p>
                    <p className="text-slate-800 whitespace-pre-wrap">
                      {selected.billingAddress || "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                      Shipping / Warehouse
                    </p>
                    <p className="text-slate-800 whitespace-pre-wrap">
                      {selected.shippingAddress || "—"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Trade References
                </h3>
                <div className="space-y-2">
                  {[
                    selected.creditReference1,
                    selected.creditReference2,
                    selected.creditReference3,
                  ].map((ref, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200 p-4 text-sm"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                        Reference {idx + 1}
                        {idx === 0 ? " (required)" : ""}
                      </p>
                      <p className="text-slate-800 whitespace-pre-wrap">
                        {ref || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {selected.notes && (
                <section className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Notes
                  </h3>
                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-800 whitespace-pre-wrap">
                    {selected.notes}
                  </div>
                </section>
              )}
            </div>

            <footer className="border-t border-slate-200 px-5 py-4 flex flex-wrap items-center gap-2 bg-white">
              {selected.status === "pending" ? (
                <>
                  <button
                    type="button"
                    disabled={busyId === selected.id || isPending}
                    onClick={() =>
                      handleStatusUpdate(selected.id, "approved")
                    }
                    className="inline-flex items-center justify-center gap-1.5 flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    {busyId === selected.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === selected.id || isPending}
                    onClick={() =>
                      handleStatusUpdate(selected.id, "rejected")
                    }
                    className="inline-flex items-center justify-center gap-1.5 flex-1 min-w-[120px] px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busyId === selected.id || isPending}
                  onClick={() =>
                    handleStatusUpdate(
                      selected.id,
                      selected.status === "approved" ? "rejected" : "approved"
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Mark as{" "}
                  {selected.status === "approved" ? "Rejected" : "Approved"}
                </button>
              )}
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
}
