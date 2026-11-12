"use client";

import React, { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Building2,
  Eye,
  Loader2,
  Mail,
  Phone,
  Save,
  X,
} from "lucide-react";
import {
  reviewCreditApplication,
  type AdminCreditApplication,
} from "@/actions/credit-applications";
import {
  CREDIT_APPLICATION_STATUSES,
  type CreditApplicationStatus,
  type ReferenceVerifyStatus,
} from "@/lib/credit-application-status";

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
  if (status === "verifying_references")
    return "bg-amber-50 text-amber-900 border-amber-200";
  if (status === "action_required")
    return "bg-orange-50 text-orange-900 border-orange-200";
  return "bg-sky-50 text-sky-900 border-sky-200";
}

function statusLabel(status: CreditApplicationStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "verifying_references":
      return "Verifying References";
    case "action_required":
      return "Action Required";
    default:
      return "Pending / In Review";
  }
}

function verifyLabel(status: ReferenceVerifyStatus): string {
  if (status === "verified") return "Verified";
  if (status === "unreachable") return "Unreachable";
  return "Pending Check";
}

function verifyBadgeClass(status: ReferenceVerifyStatus): string {
  if (status === "verified") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "unreachable") return "bg-rose-50 text-rose-800 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

interface OfficeState {
  stage: CreditApplicationStatus;
  approvedCreditLimit: string;
  approvedPaymentTerms: string;
  adminNotes: string;
  ref1VerifyStatus: ReferenceVerifyStatus;
  ref2VerifyStatus: ReferenceVerifyStatus;
  ref3VerifyStatus: ReferenceVerifyStatus;
  bankVerifyStatus: ReferenceVerifyStatus;
  notifyApplicant: boolean;
}

function officeFromApp(app: AdminCreditApplication): OfficeState {
  return {
    stage: app.status,
    approvedCreditLimit:
      app.approvedCreditLimit != null
        ? String(app.approvedCreditLimit)
        : app.creditLimitRequested != null
          ? String(app.creditLimitRequested)
          : "",
    approvedPaymentTerms:
      app.approvedPaymentTerms || app.paymentTermsRequested || "Net 30",
    adminNotes: app.adminNotes || app.adminComments || "",
    ref1VerifyStatus: app.ref1VerifyStatus || "pending_check",
    ref2VerifyStatus: app.ref2VerifyStatus || "pending_check",
    ref3VerifyStatus: app.ref3VerifyStatus || "pending_check",
    bankVerifyStatus: app.bankVerifyStatus || "pending_check",
    notifyApplicant: true,
  };
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
  const [office, setOffice] = useState<OfficeState | null>(null);
  const [didAutoOpen, setDidAutoOpen] = useState(false);

  const filtered = useMemo(() => {
    if (filter === "all") return applications;
    return applications.filter((app) => app.status === filter);
  }, [applications, filter]);

  const pendingCount = applications.filter(
    (a) =>
      a.status === "pending" ||
      a.status === "verifying_references" ||
      a.status === "action_required"
  ).length;

  const openDetail = (app: AdminCreditApplication) => {
    setSelected(app);
    setOffice(officeFromApp(app));
  };

  React.useEffect(() => {
    if (didAutoOpen || !initialSelectedId) return;
    const match = applications.find((app) => app.id === initialSelectedId);
    if (!match) return;
    openDetail(match);
    setDidAutoOpen(true);
  }, [applications, didAutoOpen, initialSelectedId]);

  const handleSaveStage = () => {
    if (!selected || !office) return;
    if (office.stage === "approved" && !office.approvedCreditLimit.trim()) {
      toast.error("Set an approved credit limit before approving.");
      return;
    }
    setBusyId(selected.id);
    startTransition(async () => {
      const result = await reviewCreditApplication({
        id: selected.id,
        status: office.stage,
        approvedCreditLimit: office.approvedCreditLimit,
        approvedPaymentTerms: office.approvedPaymentTerms,
        adminNotes: office.adminNotes,
        adminComments: office.adminNotes,
        ref1VerifyStatus: office.ref1VerifyStatus,
        ref2VerifyStatus: office.ref2VerifyStatus,
        ref3VerifyStatus: office.ref3VerifyStatus,
        bankVerifyStatus: office.bankVerifyStatus,
        notifyApplicant: office.notifyApplicant,
      });
      setBusyId(null);
      if (!result.success) {
        toast.error(result.error || "Unable to update application.");
        return;
      }
      const now = new Date().toISOString();
      const nextApp: AdminCreditApplication = {
        ...selected,
        status: office.stage,
        reviewedAt: now,
        approvalDate: office.stage === "approved" ? now : null,
        approvedCreditLimit:
          office.stage === "approved"
            ? Number(office.approvedCreditLimit.replace(/[$,\s]/g, "")) || null
            : office.stage === "rejected"
              ? null
              : selected.approvedCreditLimit,
        approvedPaymentTerms:
          office.stage === "approved"
            ? office.approvedPaymentTerms
            : office.stage === "rejected"
              ? null
              : selected.approvedPaymentTerms,
        adminComments: office.adminNotes || null,
        adminNotes: office.adminNotes || null,
        ref1VerifyStatus: office.ref1VerifyStatus,
        ref2VerifyStatus: office.ref2VerifyStatus,
        ref3VerifyStatus: office.ref3VerifyStatus,
        bankVerifyStatus: office.bankVerifyStatus,
      };
      setApplications((prev) =>
        prev.map((app) => (app.id === selected.id ? nextApp : app))
      );
      setSelected(nextApp);
      setOffice(officeFromApp(nextApp));
      toast.success(
        office.stage === "verifying_references" && office.notifyApplicant
          ? "Stage updated. Applicant notified that references are under review."
          : `Application updated to ${statusLabel(office.stage)}.`
      );
    });
  };

  const filterKeys: Array<"all" | CreditApplicationStatus> = [
    "all",
    ...CREDIT_APPLICATION_STATUSES,
  ];

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            Credit Applications
          </h1>
          <p className="text-sm text-slate-500">
            {pendingCount} in pipeline · {applications.length} total submissions
          </p>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {filterKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`shrink-0 touch-manipulation rounded-full border px-3 py-1.5 text-xs font-bold ${
                filter === key
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              {key === "all" ? "all" : statusLabel(key)}
            </button>
          ))}
        </div>
      </div>

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

      {selected && office ? (
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
                onClick={() => {
                  setSelected(null);
                  setOffice(null);
                }}
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
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Trade & Bank Reference Verification
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[1, 2, 3].map((n) => {
                    const key = `ref${n}VerifyStatus` as
                      | "ref1VerifyStatus"
                      | "ref2VerifyStatus"
                      | "ref3VerifyStatus";
                    const company = selected[
                      `ref${n}CompanyName` as keyof AdminCreditApplication
                    ];
                    const contact = selected[
                      `ref${n}ContactPerson` as keyof AdminCreditApplication
                    ];
                    const phone = selected[
                      `ref${n}Phone` as keyof AdminCreditApplication
                    ];
                    const email = selected[
                      `ref${n}Email` as keyof AdminCreditApplication
                    ];
                    return (
                      <div
                        key={n}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-900">Trade Reference #{n}</p>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${verifyBadgeClass(office[key])}`}
                          >
                            {verifyLabel(office[key])}
                          </span>
                        </div>
                        <p>{String(company || "—")}</p>
                        <p>{String(contact || "—")}</p>
                        <p>{String(phone || "—")}</p>
                        <p>{String(email || "—")}</p>
                        <label className="mt-2 block space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Checklist status
                          </span>
                          <select
                            value={office[key]}
                            onChange={(e) =>
                              setOffice((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      [key]: e.target.value as ReferenceVerifyStatus,
                                    }
                                  : prev
                              )
                            }
                            className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                          >
                            <option value="pending_check">Pending Check</option>
                            <option value="verified">Verified</option>
                            <option value="unreachable">Unreachable</option>
                          </select>
                        </label>
                      </div>
                    );
                  })}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900">Bank Reference</p>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${verifyBadgeClass(office.bankVerifyStatus)}`}
                      >
                        {verifyLabel(office.bankVerifyStatus)}
                      </span>
                    </div>
                    <p>{selected.bankName || "—"}</p>
                    <p>{selected.bankContactPerson || "—"}</p>
                    <p>{selected.bankPhone || "—"}</p>
                    <label className="mt-2 block space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Checklist status
                      </span>
                      <select
                        value={office.bankVerifyStatus}
                        onChange={(e) =>
                          setOffice((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  bankVerifyStatus: e.target
                                    .value as ReferenceVerifyStatus,
                                }
                              : prev
                          )
                        }
                        className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"
                      >
                        <option value="pending_check">Pending Check</option>
                        <option value="verified">Verified</option>
                        <option value="unreachable">Unreachable</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-800" />
                  <h3 className="text-sm font-black uppercase tracking-wide text-amber-950">
                    Timeline Stage & Office Use
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
                      Application Stage
                    </span>
                    <select
                      value={office.stage}
                      onChange={(e) =>
                        setOffice((prev) =>
                          prev
                            ? {
                                ...prev,
                                stage: e.target.value as CreditApplicationStatus,
                              }
                            : prev
                        )
                      }
                      className="min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold"
                    >
                      <option value="pending">
                        Pending — Solicitud Recibida / En Revisión
                      </option>
                      <option value="verifying_references">
                        Verifying References — Verificando Referencias
                      </option>
                      <option value="action_required">
                        Action Required — Requiere Información Adicional
                      </option>
                      <option value="approved">Approved — Aprobado</option>
                      <option value="rejected">Rejected — Rechazado</option>
                    </select>
                  </label>

                  {office.stage === "approved" ? (
                    <>
                      <label className="block space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
                          Approved Credit Limit (USD)
                        </span>
                        <input
                          value={office.approvedCreditLimit}
                          onChange={(e) =>
                            setOffice((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    approvedCreditLimit: e.target.value,
                                  }
                                : prev
                            )
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
                            setOffice((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    approvedPaymentTerms: e.target.value,
                                  }
                                : prev
                            )
                          }
                          className="min-h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm"
                        >
                          <option value="Net 15">Net 15</option>
                          <option value="Net 30">Net 30</option>
                          <option value="Net 45">Net 45</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                    </>
                  ) : null}

                  <label className="block space-y-1.5 sm:col-span-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900/80">
                      Admin Notes (internal)
                    </span>
                    <textarea
                      value={office.adminNotes}
                      onChange={(e) =>
                        setOffice((prev) =>
                          prev ? { ...prev, adminNotes: e.target.value } : prev
                        )
                      }
                      rows={4}
                      className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                      placeholder="Credit check feedback, trade reference call notes, bank verification details…"
                    />
                  </label>

                  {(office.stage === "verifying_references" ||
                    office.stage === "action_required" ||
                    office.stage === "approved" ||
                    office.stage === "rejected") && (
                    <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-white/70 px-3 py-2.5 text-xs text-amber-950 sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={office.notifyApplicant}
                        onChange={(e) =>
                          setOffice((prev) =>
                            prev
                              ? { ...prev, notifyApplicant: e.target.checked }
                              : prev
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-700"
                      />
                      <span>
                        {office.stage === "verifying_references"
                          ? "Email applicant that their references are being validated by finance (Resend)."
                          : office.stage === "action_required"
                            ? "Email applicant that additional information is required."
                            : "Email applicant with the approve / deny decision."}
                      </span>
                    </label>
                  )}
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    disabled={busyId === selected.id || isPending}
                    onClick={handleSaveStage}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-blue-950 disabled:opacity-60 sm:w-auto"
                  >
                    {busyId === selected.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Stage & Notes
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-amber-900/70">
                  Stage changes sync to <code>profiles.credit_application_status</code>.
                  Approving also sets credit limit, payment terms, and available credit.
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
