"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { completeTaxComplianceProfile } from "@/actions/customers";
import type { UserProfile } from "@/actions/auth";

/** US EIN / FEIN: XX-XXXXXXX or 9 digits */
export function isValidUsEin(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 9;
}

export function formatEinInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

interface TaxComplianceModalProps {
  profile: UserProfile;
  /** Called after successful save so parent can clear needsTaxCompliance */
  onCompleted?: (updated: {
    taxId: string;
    isTaxExempt: boolean;
    taxExemptionNumber: string;
  }) => void;
}

export function TaxComplianceModal({
  profile,
  onCompleted,
}: TaxComplianceModalProps) {
  const router = useRouter();
  const shouldOpen = Boolean(profile.needsTaxCompliance);
  const [isOpen, setIsOpen] = useState(shouldOpen);

  const [taxId, setTaxId] = useState(profile.taxId || "");
  const [isTaxExempt, setIsTaxExempt] = useState<"yes" | "no" | "">(
    profile.isTaxExempt === true
      ? "yes"
      : profile.isTaxExempt === false
        ? "no"
        : ""
  );
  const [taxExemptionNumber, setTaxExemptionNumber] = useState(
    profile.taxExemptionNumber || ""
  );
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [applyForCredit, setApplyForCredit] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsOpen(Boolean(profile.needsTaxCompliance));
  }, [profile.needsTaxCompliance]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isValidUsEin(taxId)) {
      setErrorMsg("Enter a valid US TAX ID / FEIN (format XX-XXXXXXX).");
      return;
    }
    if (isTaxExempt !== "yes" && isTaxExempt !== "no") {
      setErrorMsg("Please select Yes or No for sales tax exemption.");
      return;
    }
    if (isTaxExempt === "yes") {
      if (!taxExemptionNumber.trim() && !certificateFile) {
        setErrorMsg(
          "Provide a State Tax Exempt / Resale License Number or upload your certificate."
        );
        return;
      }
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set("taxId", taxId);
      fd.set("isTaxExempt", isTaxExempt === "yes" ? "true" : "false");
      fd.set("taxExemptionNumber", taxExemptionNumber.trim());
      fd.set("applyForCredit", applyForCredit ? "true" : "false");
      if (certificateFile) {
        fd.set("file", certificateFile);
      }

      const result = await completeTaxComplianceProfile(fd);

      if (!result.success) {
        setErrorMsg(result.error || "Unable to save your tax profile.");
        toast.error(result.error || "Unable to save your tax profile.");
        return;
      }

      const formatted = formatEinInput(taxId);
      onCompleted?.({
        taxId: formatted,
        isTaxExempt: isTaxExempt === "yes",
        taxExemptionNumber: taxExemptionNumber.trim(),
      });

      setIsOpen(false);
      toast.success("B2B tax profile saved successfully.");

      if (result.applyForCredit) {
        toast.message("Continue with your Net 30 credit application.");
        router.push("/credit-application");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tax-compliance-title"
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 sm:px-6 py-4 rounded-t-3xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-0.5">
                Compliance required
              </p>
              <h2
                id="tax-compliance-title"
                className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug"
              >
                Action Required: Complete Your B2B Account Profile
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                We need your TAX ID / FEIN and sales-tax status to keep wholesale
                pricing and invoices compliant.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-5 space-y-5">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="tax-compliance-ein"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              TAX ID / FEIN <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="tax-compliance-ein"
                type="text"
                required
                inputMode="numeric"
                autoComplete="off"
                placeholder="XX-XXXXXXX"
                value={taxId}
                onChange={(e) => setTaxId(formatEinInput(e.target.value))}
                disabled={isPending}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm font-mono font-semibold text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-60"
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Standard US Employer Identification Number (9 digits).
            </p>
          </div>

          <fieldset className="space-y-2.5">
            <legend className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Is your business exempt from US Sales Tax?{" "}
              <span className="text-rose-500">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold cursor-pointer transition-colors ${
                  isTaxExempt === "yes"
                    ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="isTaxExempt"
                  value="yes"
                  checked={isTaxExempt === "yes"}
                  onChange={() => setIsTaxExempt("yes")}
                  disabled={isPending}
                  className="sr-only"
                />
                Yes
              </label>
              <label
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold cursor-pointer transition-colors ${
                  isTaxExempt === "no"
                    ? "border-slate-800 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="isTaxExempt"
                  value="no"
                  checked={isTaxExempt === "no"}
                  onChange={() => setIsTaxExempt("no")}
                  disabled={isPending}
                  className="sr-only"
                />
                No
              </label>
            </div>
          </fieldset>

          {isTaxExempt === "yes" && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5 animate-fade-in-up">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                <FileText className="w-4 h-4 text-blue-700" />
                Exemption documentation
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tax-exempt-number"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  State Tax Exempt / Resale License Number
                </label>
                <input
                  id="tax-exempt-number"
                  type="text"
                  value={taxExemptionNumber}
                  onChange={(e) => setTaxExemptionNumber(e.target.value)}
                  placeholder="Permit / resale certificate #"
                  disabled={isPending}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="tax-certificate-file"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Upload Tax Exemption Certificate (PDF / Image)
                </label>
                <input
                  id="tax-certificate-file"
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp,application/pdf"
                  disabled={isPending}
                  onChange={(e) =>
                    setCertificateFile(e.target.files?.[0] || null)
                  }
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-800 file:font-bold file:text-xs"
                />
                <p className="text-[10px] text-slate-400">
                  Stored in the private{" "}
                  <code className="bg-slate-200/70 px-1 rounded">tax-certificates</code>{" "}
                  bucket under your account.
                </p>
              </div>
            </div>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer rounded-2xl border border-slate-200 bg-white px-3.5 py-3 hover:bg-slate-50/80 transition-colors">
            <input
              type="checkbox"
              checked={applyForCredit}
              onChange={(e) => setApplyForCredit(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-xs text-slate-700 font-medium leading-relaxed">
              Apply for B2B Commercial Credit (Net 30)
              <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                Optional — we will mark your account for credit review and open
                the full application.
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 hover:bg-blue-950 text-white text-sm font-bold shadow-md disabled:opacity-60 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving profile…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save & Continue
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400 font-medium pb-1">
            This step is required once. Your dashboard unlocks after submission.
          </p>
        </form>
      </div>
    </div>
  );
}
