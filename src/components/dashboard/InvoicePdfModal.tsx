"use client";

import React from "react";
import { CheckCircle2, FileText, Loader2, X } from "lucide-react";

export type InvoicePdfModalPhase = "idle" | "generating" | "success" | "error";

interface InvoicePdfModalProps {
  open: boolean;
  phase: InvoicePdfModalPhase;
  orderLabel?: string;
  errorMessage?: string | null;
  onClose: () => void;
}

export function InvoicePdfModal({
  open,
  phase,
  orderLabel,
  errorMessage,
  onClose,
}: InvoicePdfModalProps) {
  if (!open || phase === "idle") return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-pdf-modal-title"
      onClick={phase === "generating" ? undefined : onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5 text-sky-600" />
            </div>
            <div className="min-w-0">
              <h2
                id="invoice-pdf-modal-title"
                className="text-sm font-bold text-slate-900 truncate"
              >
                PDF Statement
              </h2>
              {orderLabel ? (
                <p className="text-[11px] font-mono text-slate-500 truncate">
                  {orderLabel}
                </p>
              ) : null}
            </div>
          </div>
          {phase !== "generating" && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-6 py-8 text-center space-y-4">
          {phase === "generating" && (
            <>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-sky-600 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-900">
                  Generating PDF Statement...
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Preparing your official Plastipac commercial invoice. The
                  download will start automatically.
                </p>
              </div>
            </>
          )}

          {phase === "success" && (
            <>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-emerald-800">
                  PDF ready — download started
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your invoice has been generated and saved to your downloads
                  folder.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </>
          )}

          {phase === "error" && (
            <>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <X className="w-7 h-7 text-rose-600" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-rose-800">
                  Unable to generate PDF
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {errorMessage ||
                    "Something went wrong while creating this statement. Please try again."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
