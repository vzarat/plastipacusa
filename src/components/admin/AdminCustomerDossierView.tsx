"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  updateAdminCustomerDossier,
  type CreditApplicationStatus,
  type CustomerDossier,
} from "@/actions/customers";
import { formatCurrency } from "@/lib/utils";

interface AdminCustomerDossierViewProps {
  dossier: CustomerDossier;
}

function isPdfUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.pdf(\?|$)/i.test(url) || url.toLowerCase().includes("application/pdf");
}

function isImageUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

export function AdminCustomerDossierView({
  dossier: initial,
}: AdminCustomerDossierViewProps) {
  const [dossier, setDossier] = useState(initial);
  const [creditStatus, setCreditStatus] = useState<CreditApplicationStatus>(
    initial.creditApplicationStatus
  );
  const [creditLimit, setCreditLimit] = useState(String(initial.creditLimit || 0));
  const [creditTerms, setCreditTerms] = useState(initial.creditTerms || "Registered");
  const [isPending, startTransition] = useTransition();

  const viewerUrl = dossier.taxCertificateSignedUrl || dossier.taxCertificateUrl;
  const showPdf = useMemo(() => isPdfUrl(viewerUrl), [viewerUrl]);
  const showImage = useMemo(
    () => isImageUrl(viewerUrl) || (!showPdf && Boolean(viewerUrl)),
    [viewerUrl, showPdf]
  );

  const saveControls = (patch: {
    taxExemptVerified?: boolean;
    creditApplicationStatus?: CreditApplicationStatus;
    creditLimit?: number;
    creditTerms?: string;
  }) => {
    startTransition(async () => {
      const result = await updateAdminCustomerDossier(dossier.id, patch);
      if (!result.success) {
        toast.error(result.error || "Unable to update customer dossier.");
        return;
      }

      setDossier((prev) => ({
        ...prev,
        taxExemptVerified:
          patch.taxExemptVerified !== undefined
            ? patch.taxExemptVerified
            : prev.taxExemptVerified,
        creditApplicationStatus:
          patch.creditApplicationStatus || prev.creditApplicationStatus,
        creditLimit:
          patch.creditLimit !== undefined ? patch.creditLimit : prev.creditLimit,
        creditTerms: patch.creditTerms || prev.creditTerms,
      }));
      toast.success("Expediente del Cliente updated.");
    });
  };

  const handleVerifyTax = (verified: boolean) => {
    saveControls({ taxExemptVerified: verified });
  };

  const handleSaveCredit = () => {
    const limit = Math.max(0, Number(creditLimit) || 0);
    saveControls({
      creditApplicationStatus: creditStatus,
      creditLimit: limit,
      creditTerms: creditTerms.trim() || "Registered",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to customers
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span>Customers</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">Expediente del Cliente</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {dossier.companyName || "Customer File"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Full B2B dossier — tax exemption, EIN, and credit controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
              dossier.creditApplicationStatus === "approved"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : dossier.creditApplicationStatus === "rejected"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-amber-50 text-amber-900 border-amber-200"
            }`}
          >
            Credit: {dossier.creditApplicationStatus}
          </span>
          {dossier.taxExemptVerified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              Tax Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
              Tax Unverified
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Profile + Tax */}
        <div className="xl:col-span-1 space-y-6">
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              Company Profile
            </h2>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-slate-400 font-semibold uppercase tracking-wider">
                  Contact
                </dt>
                <dd className="font-bold text-slate-900 mt-0.5">
                  {dossier.fullName || "—"}
                </dd>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                <div>
                  <dt className="text-slate-400 font-semibold uppercase tracking-wider">
                    Email
                  </dt>
                  <dd className="font-medium text-slate-800 break-all">
                    {dossier.email || "—"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                <div>
                  <dt className="text-slate-400 font-semibold uppercase tracking-wider">
                    Phone
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {dossier.phone || "—"}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-slate-400 font-semibold uppercase tracking-wider">
                  User ID
                </dt>
                <dd className="font-mono text-[10px] text-blue-700 font-semibold break-all mt-0.5">
                  {dossier.id}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-700" />
              Tax / EIN
            </h2>
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-slate-400 font-semibold uppercase tracking-wider">
                  Tax ID / EIN
                </dt>
                <dd className="font-mono font-bold text-slate-900 mt-0.5 text-sm">
                  {dossier.taxId || "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-semibold uppercase tracking-wider">
                  Sales Tax Exempt
                </dt>
                <dd className="mt-0.5">
                  {dossier.isTaxExempt ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      No
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 font-semibold uppercase tracking-wider">
                  Exemption Number
                </dt>
                <dd className="font-medium text-slate-800 mt-0.5">
                  {dossier.taxExemptionNumber || "—"}
                </dd>
              </div>
            </dl>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={isPending || dossier.taxExemptVerified}
                onClick={() => handleVerifyTax(true)}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                Mark Tax Exemption Verified
              </button>
              {dossier.taxExemptVerified && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleVerifyTax(false)}
                  className="inline-flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
                >
                  Revoke Verification
                </button>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Credit Application Controls
            </h2>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </label>
                <select
                  value={creditStatus}
                  onChange={(e) =>
                    setCreditStatus(e.target.value as CreditApplicationStatus)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Credit Limit (USD)
                </label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                />
                <p className="text-[10px] text-slate-400">
                  Current: {formatCurrency(dossier.creditLimit)}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Credit Terms
                </label>
                <input
                  type="text"
                  value={creditTerms}
                  onChange={(e) => setCreditTerms(e.target.value)}
                  placeholder="Net 30, Registered, etc."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
                />
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSaveCredit}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-blue-950 text-white text-xs font-bold disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                Save Credit Settings
              </button>
            </div>
          </section>
        </div>

        {/* Certificate viewer */}
        <div className="xl:col-span-2">
          <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden min-h-[520px] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Tax Exemption Certificate
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Inline viewer for the uploaded resale / exemption document.
                </p>
              </div>
              {viewerUrl && (
                <a
                  href={viewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-blue-700 hover:underline"
                >
                  Open in new tab
                </a>
              )}
            </div>

            <div className="flex-1 bg-slate-50/80 p-3 sm:p-4">
              {!viewerUrl ? (
                <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <FileText className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    No certificate uploaded
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    When the client uploads a tax exemption certificate it will
                    appear here from the private{" "}
                    <code className="text-[10px] bg-slate-200/80 px-1 rounded">
                      tax-certificates
                    </code>{" "}
                    bucket.
                  </p>
                </div>
              ) : showPdf ? (
                <iframe
                  title="Tax Exemption Certificate PDF"
                  src={viewerUrl}
                  className="w-full h-[min(70vh,640px)] rounded-xl border border-slate-200 bg-white"
                />
              ) : showImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewerUrl}
                  alt="Tax exemption certificate"
                  className="w-full max-h-[min(70vh,640px)] object-contain rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <iframe
                  title="Tax Exemption Certificate"
                  src={viewerUrl}
                  className="w-full h-[min(70vh,640px)] rounded-xl border border-slate-200 bg-white"
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
