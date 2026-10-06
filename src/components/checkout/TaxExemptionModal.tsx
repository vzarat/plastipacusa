"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";
import { toast } from "sonner";
import { submitTaxExemptionRequest } from "@/actions/tax-exemption";

export interface TaxExemptionModalProps {
  open: boolean;
  onClose: () => void;
  companyName?: string;
  registrationState?: string;
  customerEmail?: string;
  customerName?: string;
  shippingSummary?: string;
  onSubmitted?: () => void;
}

const linkClass = "font-semibold text-blue-700 hover:text-blue-800 hover:underline";

export function TaxExemptionInformationButton({
  companyName,
  registrationState,
  customerEmail,
  customerName,
  shippingSummary,
  onSubmitted,
}: Omit<TaxExemptionModalProps, "open" | "onClose">) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer flex items-center gap-1"
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Tax Exemption Information
      </button>
      <TaxExemptionModal
        open={open}
        onClose={() => setOpen(false)}
        companyName={companyName}
        registrationState={registrationState}
        customerEmail={customerEmail}
        customerName={customerName}
        shippingSummary={shippingSummary}
        onSubmitted={onSubmitted}
      />
    </>
  );
}

export function TaxExemptionModal({
  open,
  onClose,
  companyName,
  registrationState,
  customerEmail,
  customerName,
  shippingSummary,
  onSubmitted,
}: TaxExemptionModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("companyName", companyName?.trim() || customerName?.trim() || "Plastipac USA customer");
      formData.set("taxId", "See attached certificate");
      formData.set("registrationState", registrationState?.trim() || "TX");
      formData.set("customerEmail", customerEmail?.trim() || "");
      formData.set("customerName", customerName?.trim() || "");
      formData.set("shippingSummary", shippingSummary?.trim() || "");
      formData.set(
        "note",
        "Exemption certificate uploaded from checkout. Please verify before waiving sales tax."
      );
      formData.set("certificate", file);
      const result = await submitTaxExemptionRequest(formData);
      if (!result.success) {
        toast.error(result.error || "Could not upload the exemption certificate.");
        return;
      }
      onSubmitted?.();
      toast.success("Exemption certificate sent. Review usually takes 1 business day.");
    } catch {
      toast.error("Could not upload the exemption certificate.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tax-exemption-info-title"
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-50"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="tax-exemption-info-title" className="pr-8 text-lg font-black text-slate-900">
          Tax Exemption Information
        </h2>

        <section className="mt-5 space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Tax Rates & Exemption Requirements</h3>
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">
            <li>
              Plastipac USA LLC collects applicable sales tax based on the delivery destination
              state (including Texas state & local sales taxes).
            </li>
            <li>
              Resellers and tax-exempt organizations must provide a valid State Resale Certificate
              or Tax Exemption Certificate prior to tax waiver.
            </li>
            <li>
              Orders delivered outside tax-collecting jurisdictions or backed by an approved
              exemption certificate will have tax waived upon verification.
            </li>
          </ul>
        </section>

        <section className="mt-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900">Submit or Upload Exemption Certificate</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60"
            >
              {uploading ? "Uploading…" : "Upload Exemption Certificate"}
            </button>
            <a
              href="mailto:payables@plastipacusa.com,sales@plastipacusa.com?subject=Tax%20Exemption%20Certificate"
              className="inline-flex items-center bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-semibold"
            >
              Email Certificate to Tax Dept
            </a>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              void handleUpload(event.target.files?.[0]);
            }}
          />
          <p className="text-xs text-slate-500">
            Exemption certificates are reviewed and processed within 1 business day.
          </p>
        </section>

        <section className="mt-5 space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Instructions</h3>
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">
            <li>
              Upload or email your valid Texas Sales & Use Tax Resale Certificate (or applicable
              State Tax Exemption form).
            </li>
            <li>
              Place your order. Tax will be adjusted or refunded automatically once your
              certificate is approved.
            </li>
            <li>
              If your invoice includes tax that should be exempt, contact our Accounts Department
              for direct credit or invoice re-issuance.
            </li>
          </ul>
        </section>

        <section className="mt-5 space-y-2">
          <h3 className="text-sm font-bold text-slate-900">Tax & Compliance Contact</h3>
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">
            <li>
              Email:{" "}
              <a href="mailto:payables@plastipacusa.com" className={linkClass}>
                payables@plastipacusa.com
              </a>{" "}
              /{" "}
              <a href="mailto:sales@plastipacusa.com" className={linkClass}>
                sales@plastipacusa.com
              </a>
            </li>
            <li>
              Phone:{" "}
              <a href="tel:+19564003683" className={linkClass}>
                +1 (956) 400-3683
              </a>{" "}
              (Monday – Friday, 8:00 AM – 5:00 PM CST)
            </li>
          </ul>
        </section>
      </div>
    </div>,
    document.body
  );
}
