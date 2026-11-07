"use client";

import React, { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  Phone,
  X,
  XCircle,
} from "lucide-react";
import {
  reviewCreditApplication,
  type AdminCreditApplication,
  type CreditApplicationStatus,
} from "@/actions/credit-applications";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
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

function formatMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function statusBadgeClass(status: CreditApplicationStatus): string {
  if (status === "approved") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "rejected") return "bg-rose-50 text-rose-800 border-rose-200";
  return "bg-amber-50 text-amber-900 border-amber-200";
}

function statusLabel(status: CreditApplicationStatus): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Denied";
  return "Pending";
}

interface AdminCreditApplicationsViewProps {
  initialApplications: AdminCreditApplication[];
  initialSelectedId?: string | null;
}

export function AdminCreditApplicationsView({
  initialApplications,
  initialSelectedId = null,
}: AdminCreditApplicationsViewProps) {
  const [applications, setApplications] = useState(initialApplications);
  const [selected, setSelected] = useState<AdminCreditApplication | null>(null);
  const [filter, setFilter] = useState<"all" | CreditApplicationStatus>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [office, setOffice] = useState({
    approvedCreditLimit: "",
    approvedPaymentTerms: "Net 30",
    adminComments: "",
  });
  const [didAutoOpen, setDidAutoOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return applications;
    return applications.filter((app) => app.status === filter);
  }, [applications, filter]);

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  const openDetail = (app: AdminCreditApplication) => {
    setSelected(app);
    setOffice({
      approvedCreditLimit:
        app.approvedCreditLimit != null
          ? String(app.approvedCreditLimit)
          : app.creditLimitRequested != null
            ? String(app.creditLimitRequested)
            : "",
      approvedPaymentTerms:
        app.approvedPaymentTerms || app.paymentTermsRequested || "Net 30",
      adminComments: app.adminComments || "",
    });
  };

  React.useEffect(() => {
    if (didAutoOpen || !initialSelectedId) return;
    const match = applications.find((app) => app.id === initialSelectedId);
    if (!match) return;
    setSelected(match);
    setOffice({
      approvedCreditLimit:
        match.approvedCreditLimit != null
          ? String(match.approvedCreditLimit)
          : match.creditLimitRequested != null
            ? String(match.creditLimitRequested)
            : "",
      approvedPaymentTerms:
        match.approvedPaymentTerms || match.paymentTermsRequested || "Net 30",
      adminComments: match.adminComments || "",
    });
    setDidAutoOpen(true);
  }, [applications, didAutoOpen, initialSelectedId]);

  const handleReview = (status: "approved" | "rejected") => {
    if (!selected) return;
    if (status === "approved" && !office.approvedCreditLimit.trim()) {
      toast.error("Set an approved credit limit before approving.");
      return;
    }
    setBusyId(selected.id);
    startTransition(async () => {
      const result = await reviewCreditApplication({
        id: selected.id,
        status,
        approvedCreditLimit: office.approvedCreditLimit,
        approvedPaymentTerms: office.approvedPaymentTerms,
        adminComments: office.adminComments,
      });
      setBusyId(null);
      if (!result.success) {
        toast.error(result.error || "Unable to update application.");
        return;
      }
      const now = new Date().toISOString();
      setApplications((prev) =>
        prev.map((app) =>
          app.id === selected.id
            ? {
                ...app,
                status,
                reviewedAt: now,
                approvalDate: status === "approved" ? now : null,
                approvedCreditLimit:
                  status === "approved"
                    ? Number(office.approvedCreditLimit.replace(/[$,\s]/g, "")) || null
                    : null,
                approvedPaymentTerms:
                  status === "approved" ? office.approvedPaymentTerms : null,
                adminComments: office.adminComments || null,
              }
            : app
        )
      );
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              status,
              reviewedAt: now,
              approvalDate: status === "approved" ? now : null,
              approvedCreditLimit:
                status === "approved"
                  ? Number(office.approvedCreditLimit.replace(/[$,\s]/g, "")) || null
                  : null,
              approvedPaymentTerms:
                status === "approved" ? office.approvedPaymentTerms : null,
              adminComments: office.adminComments || null,
            }
          : prev
      );
      toast.success(
        status === "approved"
          ? "Application approved. Notifications sent."
          : "Application denied. Notifications sent."
      );
    });
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Credit Applications
          </h1>
          <p className="text-sm text-slate-500">
            {pendingCount} pending · {applications.length} total submissions
          </p>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {(["all", "pending", "approved", "rejected"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`shrink-0 touch-manipulation rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${
                filter === key
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {key === "rejected" ? "Denied" : key}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2.5 md:hidden">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
            No credit applications found.
          </div>
        ) : (
          filtered.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => openDetail(app)}
              className="flex w-full touch-manipulation flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {app.legalBusinessName || app.companyName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{app.workEmail}</p>
                </div>
                <span
                  className={`shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusBadgeClass(app.status)}`}
                >
                  {statusLabel(app.status)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  {formatMoney(app.creditLimitRequested)} ·{" "}
                  {app.paymentTermsRequested || "Net 30"}
                </span>
                <span>{formatDate(app.createdAt)}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700">
                <Eye className="h-3.5 w-3.5" />
                Review
              </span>
            </button>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Company</th>
                <th className="px-4 py-3 font-bold">Requested</th>
                <th className="px-4 py-3 font-bold">Submitted</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                    No credit applications found.
                  </td>
                </tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {app.legalBusinessName || app.companyName}
                      </div>
                      <div className="text-xs text-slate-500">{app.workEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{formatMoney(app.creditLimitRequested)}</div>
                      <div className="text-xs text-slate-500">
                        {app.paymentTermsRequested || "Net 30"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClass(app.status)}`}
                      >
                        {statusLabel(app.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetail(app)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
          <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[95vh] sm:rounded-3xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-3 py-3.5 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Application detail
                </p>
                <h2 className="truncate text-base font-black text-slate-900 sm:text-lg">
                  {selected.legalBusinessName || selected.companyName}
                </h2>
                <p className="text-xs text-slate-500">
                  Submitted {formatDate(selected.createdAt)} ·{" "}
                  {statusLabel(selected.status)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="shrink-0 touch-manipulation rounded-full border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard
                  title="Business"
                  rows={[
                    ["Legal name", selected.legalBusinessName || selected.companyName],
                    ["DBA", selected.dbaName || "—"],
                    ["Tax ID / EIN", selected.taxIdEin || "—"],
                    ["Type", selected.businessType || "—"],
                    ["Years", selected.yearsInBusiness?.toString() || "—"],
                    ["Website", selected.website || "—"],
                  ]}
                />
                <InfoCard
                  title="Request"
                  rows={[
                    ["Limit requested", formatMoney(selected.creditLimitRequested)],
                    ["Terms requested", selected.paymentTermsRequested || "—"],
                    ["Phone", selected.phone || "—"],
                    ["Email", selected.workEmail || "—"],
                  ]}
                />
                <InfoCard
                  title="Accounts Payable"
                  rows={[
                    ["Name", selected.apContactName || "—"],
                    ["Phone", selected.apPhone || "—"],
                    ["Email", selected.apEmail || "—"],
                  ]}
                />
                <InfoCard
                  title="Authorization"
                  rows={[
                    ["Representative", selected.authorizedRepresentativeName || "—"],
                    ["Title", selected.authorizedTitle || "—"],
                    ["E-signature", selected.eSignature || "—"],
                    ["Signed", formatDate(selected.signatureDate)],
                  ]}
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Trade references
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((n) => {
                    const company =
                      selected[
                        `ref${n}CompanyName` as keyof AdminCreditApplication
                      ];
                    const contact =
                      selected[
                        `ref${n}ContactPerson` as keyof AdminCreditApplication
                      ];
                    const phone =
                      selected[`ref${n}Phone` as keyof AdminCreditApplication];
                    return (
                      <div
                        key={n}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700"
                      >
                        <p className="font-bold text-slate-900">Reference #{n}</p>
                        <p>{String(company || "—")}</p>
                        <p>{String(contact || "—")}</p>
                        <p>{String(phone || "—")}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* FOR OFFICE USE ONLY */}
              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-800" />
                  <h3 className="text-sm font-black uppercase tracking-wide text-amber-950">
                    For Office Use Only
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
                      Approved Credit Limit (USD)
                    </span>
                    <input
                      value={office.approvedCreditLimit}
                      onChange={(e) =>
                        setOffice((prev) => ({
                          ...prev,
                          approvedCreditLimit: e.target.value,
                        }))
                      }
                      className="min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm"
                      placeholder="10000"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
                      Approved Payment Terms
                    </span>
                    <select
                      value={office.approvedPaymentTerms}
                      onChange={(e) =>
                        setOffice((prev) => ({
                          ...prev,
                          approvedPaymentTerms: e.target.value,
                        }))
                      }
                      className="min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm"
                    >
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
                      Admin Comments
                    </span>
                    <textarea
                      value={office.adminComments}
                      onChange={(e) =>
                        setOffice((prev) => ({
                          ...prev,
                          adminComments: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Internal review notes…"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={busyId === selected.id || isPending}
                    onClick={() => handleReview("approved")}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busyId === selected.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve Application
                  </button>
                  <button
                    type="button"
                    disabled={busyId === selected.id || isPending}
                    onClick={() => handleReview("rejected")}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {busyId === selected.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    Deny Application
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-amber-900/70">
                  Status changes notify orders@, support@, contact@, payables@, and the applicant email.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                {selected.workEmail ? (
                  <a
                    href={`mailto:${selected.workEmail}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-sky-700"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {selected.workEmail}
                  </a>
                ) : null}
                {selected.phone ? (
                  <a
                    href={`tel:${selected.phone}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-sky-700"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {selected.phone}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </p>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-3"
          >
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="break-words font-medium text-slate-900 sm:text-right">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
