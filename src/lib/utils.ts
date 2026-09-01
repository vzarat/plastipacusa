import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatRollDimensions(width: string | number, gauge: number, length: number): string {
  return `${width}" × ${length.toLocaleString()} ft • ${gauge} Ga`;
}
