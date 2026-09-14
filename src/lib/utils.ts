import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface OrderLike {
  id?: string;
  createdAt?: string;
  created_at?: string;
  items?: Array<{
    gauge?: number | string | null;
    quantity?: number;
  }>;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericAmount || 0);
}

export function formatGauge(gauge: number): string {
  return `${gauge} Ga (${(gauge * 0.254).toFixed(1)} µm)`;
}

export function formatOrderId(orderLike?: OrderLike): string {
  const rawId = orderLike?.id?.trim();

  if (!rawId) {
    return "ORD-UNKNOWN-00-UNKNOWN";
  }

  if (rawId.startsWith("ORD-")) {
    return rawId;
  }

  const gaugeCandidates = (orderLike?.items || [])
    .map((item) => Number(item?.gauge))
    .filter((value) => Number.isFinite(value) && value > 0);

  const gaugeValue = gaugeCandidates.length > 0 ? Math.max(...gaugeCandidates) : 0;

  const createdAt = orderLike?.createdAt || orderLike?.created_at || new Date().toISOString();
  const dateLabel = new Date(createdAt).toISOString().slice(0, 10).replace(/-/g, "");

  const normalizedSuffix = rawId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-7)
    .toUpperCase();

  return `ORD-${dateLabel}-${String(gaugeValue || 0).padStart(2, "0")}-${normalizedSuffix || "UNKNOWN"}`;
}

export function formatRollDimensions(width: string | number, gauge: number, length: number): string {
  return `${width}" × ${length.toLocaleString()} ft • ${gauge} Ga`;
}
