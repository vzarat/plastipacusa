"use client";

import React from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { MyCreditStatus } from "@/actions/credit-applications";

export type CreditTimelineStatus =
  | "pending"
  | "under_review"
  | "verifying_references"
  | "approved"
  | "rejected";

interface CreditStatusTimelineProps {
  status: CreditTimelineStatus;
  creditLimit?: string;
  paymentTerms?: string;
  applicationDate?: string | null;
  applicationId?: string | null;
}

/** Map dashboard/DB credit status onto the 5-stage B2B timeline. */
export function mapMyCreditStatusToTimeline(
  status: MyCreditStatus
): CreditTimelineStatus | null {
  if (status === "not_applied") return null;
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  // Submitted apps sit in finance review until admin decision.
  return "under_review";
}

function progressPercent(status: CreditTimelineStatus): number {
  switch (status) {
    case "pending":
      return 20;
    case "under_review":
      return 40;
    case "verifying_references":
      return 60;
    case "rejected":
      return 80;
    case "approved":
      return 100;
    default:
      return 20;
  }
}

function activeStepIndex(status: CreditTimelineStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "under_review":
      return 1;
    case "verifying_references":
      return 2;
    case "rejected":
    case "approved":
      return 3;
    default:
      return 0;
  }
}

export function CreditStatusTimeline({
  status = "pending",
  creditLimit,
  paymentTerms,
  applicationDate,
  applicationId,
}: CreditStatusTimelineProps) {
  const steps = [
    { id: "submitted", label: "Application Received" },
    { id: "review", label: "Financial Review" },
    { id: "references", label: "Verifying References" },
    {
      id: "decision",
      label:
        status === "approved"
          ? "Approved"
          : status === "rejected"
            ? "Rejected"
            : "Final Decision",
    },
    { id: "active", label: "Credit Active" },
  ];

  const percent = progressPercent(status);
  const currentIdx = activeStepIndex(status);
  const barTone =
    status === "rejected"
      ? "from-rose-500 via-rose-400 to-amber-400"
      : status === "approved"
        ? "from-blue-600 via-cyan-400 to-emerald-500"
        : "from-blue-600 via-cyan-400 to-sky-500";

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Commercial Credit Status
          </h3>
          <p className="text-sm text-slate-500">
            Track your B2B credit line review in real time.
          </p>
          {(applicationDate || applicationId) && (
            <p className="mt-1 text-[11px] text-slate-400">
              {applicationDate ? `Submitted ${applicationDate}` : null}
              {applicationDate && applicationId ? " · " : null}
              {applicationId ? (
                <span className="font-mono">Ref {applicationId.slice(0, 8)}</span>
              ) : null}
            </p>
          )}
        </div>

        <div>
          {status === "approved" && (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              ✓ Approved
              {creditLimit || paymentTerms
                ? ` (${[creditLimit, paymentTerms].filter(Boolean).join(" · ")})`
                : ""}
            </span>
          )}
          {status === "verifying_references" && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <Building2 className="mr-1 h-3.5 w-3.5 animate-bounce" />
              Verifying Trade References
            </span>
          )}
          {(status === "pending" || status === "under_review") && (
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              <Clock className="mr-1 h-3.5 w-3.5 animate-pulse" />
              Under Finance Review
            </span>
          )}
          {status === "rejected" && (
            <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
              <AlertCircle className="mr-1 h-3.5 w-3.5" />
              Not Approved
            </span>
          )}
        </div>
      </div>

      <div className="relative my-4">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`relative h-full overflow-hidden rounded-full bg-gradient-to-r ${barTone} transition-[width] duration-700 ease-out`}
            style={{ width: `${percent}%` }}
          >
            <div
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 animate-creditShimmer bg-gradient-to-r from-transparent via-white/50 to-transparent"
              aria-hidden
            />
          </div>
        </div>

        <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-2">
          {steps.map((step, index) => {
            const isDecision = index === 3;
            const isActive =
              index === currentIdx ||
              (status === "approved" && index === 4) ||
              (status === "rejected" && isDecision);
            const isComplete =
              status === "approved"
                ? true
                : status === "rejected"
                  ? index < 3
                  : index < currentIdx;
            const rejectedDecision = status === "rejected" && isDecision;

            return (
              <li
                key={step.id}
                className={`flex flex-col items-start gap-1.5 sm:items-center sm:text-center ${
                  isActive || isComplete ? "opacity-100" : "opacity-45"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
                    rejectedDecision
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : isComplete || (status === "approved" && index === 4)
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : isActive
                          ? "border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {rejectedDecision ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : isComplete || (status === "approved" && index === 4) ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`text-[11px] font-semibold leading-snug ${
                    rejectedDecision
                      ? "text-rose-700"
                      : isActive
                        ? "text-slate-900"
                        : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
