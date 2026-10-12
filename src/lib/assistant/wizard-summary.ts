import type { EstimateUsageResult } from "@/lib/assistant/estimate-usage";
import type { FreightRate } from "@/lib/assistant/freight-rate";
import type { PalletQuote } from "@/lib/assistant/pallet-calculator";
import type { ProductRecommendation } from "@/lib/assistant/recommend-product";
import type { AssistantResult } from "@/lib/assistant/types";

export function summarizeUsage(result: EstimateUsageResult): string {
  if (!result.ok) return result.error;
  if (result.usage === "usage_unavailable") {
    if (result.palletsPerMonth == null) {
      return "The catalog has no film-per-pallet rate. Contact sales for a usage figure.";
    }
    return `That schedule is ${result.palletsPerMonth} pallets per month. The catalog has no film-per-pallet rate, so rolls and pounds are unavailable. Contact sales if you need that figure.`;
  }
  const parts: string[] = [];
  if (result.rollsPerMonth != null) parts.push(`${result.rollsPerMonth} rolls per month`);
  if (result.boxesPerMonth != null) parts.push(`${result.boxesPerMonth} boxes per month`);
  if (result.rollsPerDay != null) parts.push(`${result.rollsPerDay} rolls per day`);
  return parts.length > 0 ? `${parts.join(", ")}.` : "Usage is calculated from the saved profile.";
}

export function summarizeRecommendation(result: AssistantResult<ProductRecommendation>): string {
  if (!result.ok) return result.error;
  const film = result.film === "machine" ? "Machine film" : "Hand film";
  return `${film}, ${result.widthInches}" , ${result.gauge} GA, ${result.tier.replace("_", " ")}, quantity ${result.quantity}. ${result.reason}`;
}

export function summarizeQuote(result: AssistantResult<PalletQuote>): string {
  if (!result.ok) return result.error;
  if (result.price === "price_unavailable" || result.unitPrice == null || result.totalPrice == null) {
    return "The catalog has no price for that package. Contact sales.";
  }
  return `${result.tier.replace("_", " ")}, quantity ${result.quantity}. Unit price ${result.unitPrice}. Total ${result.totalPrice}.`;
}

export function summarizeFreight(result: AssistantResult<FreightRate>): string {
  if (!result.ok) return result.error;
  return `${result.methodLabel}. Estimated shipping ${result.estimatedShippingUsd} USD. This freight figure is an estimate.`;
}
