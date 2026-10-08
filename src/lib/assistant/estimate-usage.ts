import type { UsageRates } from "@/lib/assistant/usage-rates";
import { USAGE_RATES } from "@/lib/assistant/usage-rates";

export type UsageMethod = "machine" | "hand";
export type MonthlyUnit = "boxes" | "rolls";

export interface EstimateUsageInput {
  method: UsageMethod;
  widthInches?: 15 | 18 | 20;
  palletsPerDay?: number;
  daysPerMonth?: number;
  monthlyUnit?: MonthlyUnit;
  monthlyAmount?: number;
}

export interface UsageEstimate {
  method: UsageMethod;
  widthInches: number | null;
  palletsPerDay: number | null;
  palletsPerMonth: number | null;
  rollsPerDay: number | null;
  rollsPerMonth: number | null;
  boxesPerMonth: number | null;
  poundsPerDay: number | null;
  poundsPerMonth: number | null;
  /** "calculated" when every film figure comes from config. "usage_unavailable" when the wrap yield is not configured. */
  usage: "calculated" | "usage_unavailable";
  rateSource: "hand-package-ladder" | null;
}

export type EstimateUsageResult =
  | ({ ok: true } & UsageEstimate)
  | { ok: false; error: string; missing: string[] };

const MAX_PALLETS_PER_DAY = 2000;
const MAX_MONTHLY_AMOUNT = 100000;

function wholeNumber(value: number | undefined, min: number, max: number): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < min || value > max) return null;
  return value;
}

function divide(total: number, days: number): number {
  const amount = total / days;
  return Number.isInteger(amount) ? amount : Math.round(amount * 100) / 100;
}

export function estimateUsage(
  input: EstimateUsageInput,
  rates: UsageRates = USAGE_RATES
): EstimateUsageResult {
  if (input.method !== "machine" && input.method !== "hand") {
    return { ok: false, error: "Ask whether the buyer wraps by machine or by hand.", missing: ["method"] };
  }

  if (input.method === "machine") {
    const missing: string[] = [];
    if (input.widthInches == null) missing.push("widthInches");
    if (input.palletsPerDay == null) missing.push("palletsPerDay");
    if (input.daysPerMonth == null) missing.push("daysPerMonth");
    if (missing.length > 0) {
      return {
        ok: false,
        error: "Ask for the missing machine-film figures before calculating usage.",
        missing,
      };
    }
    if (input.widthInches !== 20) {
      return {
        ok: false,
        error: 'Machine film in the catalog is 20" only.',
        missing: ["widthInches"],
      };
    }
    const palletsPerDay = wholeNumber(input.palletsPerDay, 1, MAX_PALLETS_PER_DAY);
    const daysPerMonth = wholeNumber(input.daysPerMonth, 1, 31);
    if (palletsPerDay == null || daysPerMonth == null) {
      return {
        ok: false,
        error: "Pallets per day and operating days must be whole numbers in range.",
        missing: ["palletsPerDay", "daysPerMonth"],
      };
    }
    const palletsPerMonth = palletsPerDay * daysPerMonth;
    const rollsPerPallet = rates.machineRollsPerWrappedPallet;
    const poundsPerPallet = rates.machinePoundsPerWrappedPallet;
    const hasRolls = rollsPerPallet != null && rollsPerPallet > 0;
    const hasPounds = poundsPerPallet != null && poundsPerPallet > 0;
    return {
      ok: true,
      method: "machine",
      widthInches: 20,
      palletsPerDay,
      palletsPerMonth,
      rollsPerDay: hasRolls ? divide(rollsPerPallet * palletsPerDay, 1) : null,
      rollsPerMonth: hasRolls ? rollsPerPallet * palletsPerMonth : null,
      boxesPerMonth: null,
      poundsPerDay: hasPounds ? divide(poundsPerPallet * palletsPerDay, 1) : null,
      poundsPerMonth: hasPounds ? poundsPerPallet * palletsPerMonth : null,
      usage: hasRolls || hasPounds ? "calculated" : "usage_unavailable",
      rateSource: null,
    };
  }

  const missing: string[] = [];
  if (input.monthlyUnit == null) missing.push("monthlyUnit");
  if (input.monthlyAmount == null) missing.push("monthlyAmount");
  if (missing.length > 0) {
    return {
      ok: false,
      error: "Ask how many boxes or rolls of hand film the buyer uses per month.",
      missing,
    };
  }
  if (input.widthInches != null && input.widthInches !== 15 && input.widthInches !== 18) {
    return {
      ok: false,
      error: 'Hand film is 15" or 18".',
      missing: ["widthInches"],
    };
  }
  if (input.monthlyUnit !== "boxes" && input.monthlyUnit !== "rolls") {
    return { ok: false, error: "Monthly film must be counted in boxes or rolls.", missing: ["monthlyUnit"] };
  }
  const monthlyAmount = wholeNumber(input.monthlyAmount, 1, MAX_MONTHLY_AMOUNT);
  if (monthlyAmount == null) {
    return {
      ok: false,
      error: "Monthly film amount must be a whole number of 1 or more.",
      missing: ["monthlyAmount"],
    };
  }
  const rollsPerBox = rates.handRollsPerBox;
  if (!Number.isInteger(rollsPerBox) || rollsPerBox < 1) {
    return {
      ok: false,
      error: "Hand-film rolls per box are not configured.",
      missing: ["handRollsPerBox"],
    };
  }
  const rollsPerMonth = input.monthlyUnit === "boxes" ? monthlyAmount * rollsPerBox : monthlyAmount;
  const boxesPerMonth =
    input.monthlyUnit === "boxes"
      ? monthlyAmount
      : rollsPerMonth % rollsPerBox === 0
        ? rollsPerMonth / rollsPerBox
        : null;
  const daysPerMonth = input.daysPerMonth == null ? null : wholeNumber(input.daysPerMonth, 1, 31);
  if (input.daysPerMonth != null && daysPerMonth == null) {
    return {
      ok: false,
      error: "Operating days must be a whole number from 1 to 31.",
      missing: ["daysPerMonth"],
    };
  }

  return {
    ok: true,
    method: "hand",
    widthInches: input.widthInches ?? null,
    palletsPerDay: null,
    palletsPerMonth: null,
    rollsPerDay: daysPerMonth == null ? null : divide(rollsPerMonth, daysPerMonth),
    rollsPerMonth,
    boxesPerMonth,
    poundsPerDay: null,
    poundsPerMonth: null,
    usage: "calculated",
    rateSource: "hand-package-ladder",
  };
}
