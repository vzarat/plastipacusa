"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResendUsageSnapshot } from "@/lib/resend-usage";

function isUsageSnapshot(value: unknown): value is ResendUsageSnapshot {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.sentThisMonth === "number" &&
    typeof record.monthlyLimit === "number" &&
    typeof record.sentToday === "number" &&
    typeof record.dailyLimit === "number"
  );
}

function barTone(percent: number): {
  fill: string;
  track: string;
  label: string;
} {
  if (percent > 90) {
    return {
      fill: "bg-rose-500",
      track: "bg-rose-100",
      label: "text-rose-700",
    };
  }
  if (percent >= 70) {
    return {
      fill: "bg-amber-500",
      track: "bg-amber-100",
      label: "text-amber-700",
    };
  }
  return {
    fill: "bg-sky-600",
    track: "bg-sky-100",
    label: "text-sky-700",
  };
}

function UsageBar({
  label,
  used,
  limit,
  percent,
}: {
  label: string;
  used: number;
  limit: number;
  percent: number;
}) {
  const tone = barTone(percent);
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className={`font-bold tabular-nums ${tone.label}`}>
          {used.toLocaleString()} / {limit.toLocaleString()} ({percent}%)
        </span>
      </div>
      <div
        className={`h-2.5 overflow-hidden rounded-full ${tone.track}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${tone.fill}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function ResendEmailUsageCard() {
  const [usage, setUsage] = useState<ResendUsageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/email-usage", { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Unable to load email usage.";
        setError(message);
        setUsage(null);
        return;
      }
      if (!isUsageSnapshot(payload)) {
        setError("Unexpected usage payload.");
        setUsage(null);
        return;
      }
      setUsage(payload);
    } catch {
      setError("Network error while loading email usage.");
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sourceLabel =
    usage?.source === "resend"
      ? "Resend metrics"
      : usage?.source === "supabase"
        ? "Logged dispatches"
        : "Unavailable";

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Mail className="h-4 w-4 text-sky-600" />
            <span>Email Service Usage (Resend)</span>
          </div>
          <p className="text-xs text-slate-500">
            {usage?.monthLabel
              ? `Quota tracking for ${usage.monthLabel} (America/Chicago).`
              : "Monthly and daily Resend send quotas."}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          disabled={loading}
          className="h-8 rounded-xl border-slate-200 px-3 text-xs font-semibold"
        >
          {loading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {usage?.showWarning ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="leading-relaxed">
            <span className="font-bold">Approaching monthly limit.</span> Usage
            is at {usage.monthPercent}% of your Resend quota. Consider upgrading
            the plan or pausing automated campaigns before the limit is hit.
          </p>
        </div>
      ) : null}

      {loading && !usage ? (
        <div className="flex items-center gap-2 py-6 text-xs font-semibold text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          Loading email usage…
        </div>
      ) : null}

      {error && !usage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      {usage ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Sent this month
              </p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-900">
                {usage.sentThisMonth.toLocaleString()}
                <span className="text-sm font-semibold text-slate-400">
                  {" "}
                  / {usage.monthlyLimit.toLocaleString()}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Sent today
              </p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-900">
                {usage.sentToday.toLocaleString()}
                <span className="text-sm font-semibold text-slate-400">
                  {" "}
                  / {usage.dailyLimit.toLocaleString()}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Remaining quota
              </p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-900">
                {usage.remainingMonthly.toLocaleString()}
                <span className="text-sm font-semibold text-slate-400"> left</span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <UsageBar
              label="Monthly capacity"
              used={usage.sentThisMonth}
              limit={usage.monthlyLimit}
              percent={usage.monthPercent}
            />
            <UsageBar
              label="Daily capacity"
              used={usage.sentToday}
              limit={usage.dailyLimit}
              percent={usage.dayPercent}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>
              Source: <span className="font-semibold text-slate-700">{sourceLabel}</span>
            </span>
            {usage.configured ? null : (
              <span className="font-semibold text-amber-700">
                RESEND_API_KEY not configured
              </span>
            )}
            {usage.error ? (
              <span className="text-amber-700">{usage.error}</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
