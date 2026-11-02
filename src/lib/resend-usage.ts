import { Resend } from "resend";
import { isServiceRoleConfigured, createServiceRoleClient } from "@/lib/supabase/admin";

/** Free-tier style defaults; override with RESEND_MONTHLY_LIMIT / RESEND_DAILY_LIMIT. */
export const DEFAULT_RESEND_MONTHLY_LIMIT = 3_000;
export const DEFAULT_RESEND_DAILY_LIMIT = 100;
export const RESEND_USAGE_WARNING_PCT = 85;

const USAGE_TZ = "America/Chicago";

export type ResendUsageSource = "resend" | "supabase" | "none";

export interface ResendUsageSnapshot {
  source: ResendUsageSource;
  sentThisMonth: number;
  sentToday: number;
  monthlyLimit: number;
  dailyLimit: number;
  remainingMonthly: number;
  remainingDaily: number;
  monthPercent: number;
  dayPercent: number;
  showWarning: boolean;
  monthLabel: string;
  checkedAt: string;
  configured: boolean;
  error?: string;
}

function parseLimit(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function getResendUsageLimits(): {
  monthlyLimit: number;
  dailyLimit: number;
} {
  return {
    monthlyLimit: parseLimit(
      process.env.RESEND_MONTHLY_LIMIT,
      DEFAULT_RESEND_MONTHLY_LIMIT
    ),
    dailyLimit: parseLimit(
      process.env.RESEND_DAILY_LIMIT,
      DEFAULT_RESEND_DAILY_LIMIT
    ),
  };
}

function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim() || "";
  return Boolean(key) && !key.includes("placeholder") && key !== "re_123456789";
}

function chicagoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: USAGE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value || "2026";
  const month = parts.find((p) => p.type === "month")?.value || "01";
  const day = parts.find((p) => p.type === "day")?.value || "01";
  return { year, month, day };
}

/** Calendar bounds in America/Chicago for Resend metrics + local log counts. */
export function usageDateWindows(now = new Date()): {
  monthStart: string;
  dayStart: string;
  end: string;
  monthLabel: string;
  monthStartIso: string;
  dayStartIso: string;
} {
  const { year, month, day } = chicagoParts(now);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthIndex = Number(month) - 1;
  // Date-only for Resend metrics; Chicago-midnight ISO for Supabase timestamps.
  const monthDate = `${year}-${month}-01`;
  const dayDate = `${year}-${month}-${day}`;
  return {
    monthStart: monthDate,
    dayStart: dayDate,
    end: now.toISOString(),
    monthLabel: `${monthNames[monthIndex] || month} ${year}`,
    monthStartIso: `${monthDate}T00:00:00-06:00`,
    dayStartIso: `${dayDate}T00:00:00-06:00`,
  };
}

function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 1000) / 10);
}

function buildSnapshot(input: {
  source: ResendUsageSource;
  sentThisMonth: number;
  sentToday: number;
  configured: boolean;
  monthLabel: string;
  error?: string;
}): ResendUsageSnapshot {
  const { monthlyLimit, dailyLimit } = getResendUsageLimits();
  const sentThisMonth = Math.max(0, Math.floor(input.sentThisMonth));
  const sentToday = Math.max(0, Math.floor(input.sentToday));
  const monthPercent = pct(sentThisMonth, monthlyLimit);
  return {
    source: input.source,
    sentThisMonth,
    sentToday,
    monthlyLimit,
    dailyLimit,
    remainingMonthly: Math.max(0, monthlyLimit - sentThisMonth),
    remainingDaily: Math.max(0, dailyLimit - sentToday),
    monthPercent,
    dayPercent: pct(sentToday, dailyLimit),
    showWarning: monthPercent >= RESEND_USAGE_WARNING_PCT,
    monthLabel: input.monthLabel,
    checkedAt: new Date().toISOString(),
    configured: input.configured,
    ...(input.error ? { error: input.error } : {}),
  };
}

async function sentCountFromResend(
  startDate: string,
  endDate: string
): Promise<number> {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const { data, error } = await resend.emails.metrics({
    startDate,
    endDate,
    timezone: USAGE_TZ,
    metrics: ["sent"],
  });
  if (error) {
    throw new Error(error.message || "Resend metrics failed.");
  }
  return Number(data?.totals?.sent ?? 0) || 0;
}

async function sentCountFromSupabase(
  startIso: string,
  endIso: string
): Promise<number | null> {
  if (!isServiceRoleConfigured()) return null;
  try {
    const supabase = createServiceRoleClient();
    const { count, error } = await supabase
      .from("email_dispatches")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    if (error) {
      // Table may not exist yet — caller falls back.
      return null;
    }
    return count ?? 0;
  } catch {
    return null;
  }
}

/**
 * Monthly + daily send metrics for the admin usage card.
 * Prefers Resend metrics; falls back to email_dispatches when available.
 */
export async function getResendUsageSnapshot(): Promise<ResendUsageSnapshot> {
  const windows = usageDateWindows();
  const configured = isResendConfigured();

  if (configured) {
    try {
      const [sentThisMonth, sentToday] = await Promise.all([
        sentCountFromResend(windows.monthStart, windows.end),
        sentCountFromResend(windows.dayStart, windows.end),
      ]);
      return buildSnapshot({
        source: "resend",
        sentThisMonth,
        sentToday,
        configured: true,
        monthLabel: windows.monthLabel,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const [monthCount, dayCount] = await Promise.all([
        sentCountFromSupabase(windows.monthStartIso, windows.end),
        sentCountFromSupabase(windows.dayStartIso, windows.end),
      ]);
      if (monthCount !== null && dayCount !== null) {
        return buildSnapshot({
          source: "supabase",
          sentThisMonth: monthCount,
          sentToday: dayCount,
          configured: true,
          monthLabel: windows.monthLabel,
          error: `Resend metrics unavailable (${message}). Showing logged sends.`,
        });
      }
      return buildSnapshot({
        source: "none",
        sentThisMonth: 0,
        sentToday: 0,
        configured: true,
        monthLabel: windows.monthLabel,
        error: message,
      });
    }
  }

  const [monthCount, dayCount] = await Promise.all([
    sentCountFromSupabase(windows.monthStartIso, windows.end),
    sentCountFromSupabase(windows.dayStartIso, windows.end),
  ]);
  if (monthCount !== null && dayCount !== null) {
    return buildSnapshot({
      source: "supabase",
      sentThisMonth: monthCount,
      sentToday: dayCount,
      configured: false,
      monthLabel: windows.monthLabel,
    });
  }

  return buildSnapshot({
    source: "none",
    sentThisMonth: 0,
    sentToday: 0,
    configured: false,
    monthLabel: windows.monthLabel,
    error: "RESEND_API_KEY is not configured.",
  });
}

/** Best-effort audit row after a successful Resend send. Never throws. */
export async function logEmailDispatch(input: {
  resendId?: string | null;
  subject: string;
  recipientCount: number;
  status?: "sent" | "failed" | "skipped";
}): Promise<void> {
  if (!isServiceRoleConfigured()) return;
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("email_dispatches").insert({
      resend_id: input.resendId || null,
      subject: input.subject.slice(0, 240),
      recipient_count: Math.max(1, input.recipientCount),
      status: input.status || "sent",
    });
  } catch {
    // Ignore missing table / RLS / local env gaps.
  }
}
