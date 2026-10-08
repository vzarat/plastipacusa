import { palletCalculator, type CatalogPrice, type PalletCalculatorInput } from "@/lib/assistant/pallet-calculator";
import { estimateShippingCost, type DeliveryMethodId } from "@/lib/shipping-method";
import { evalShippingEligibility } from "@/lib/shippingRules";
import type { AssistantResult } from "@/lib/assistant/types";

export interface FreightRateInput extends PalletCalculatorInput {
  postalCode: string;
  city?: string;
  state?: string;
}

export interface FreightRate {
  region: string;
  boxCount: number;
  weightLbs: number;
  freeDeliveryEligible: boolean;
  boxesToUnlock: number;
  methodId: DeliveryMethodId;
  methodLabel: string;
  estimatedShippingUsd: number;
  notice: string | null;
  banner: string | null;
}

const MAX_CITY_LENGTH = 80;
const MAX_STATE_LENGTH = 32;

export function freightRateCheck(
  input: FreightRateInput,
  catalog?: CatalogPrice | null
): AssistantResult<FreightRate> {
  const postalCode = String(input.postalCode || "").trim();
  if (!/^\d{5}$/.test(postalCode)) {
    return { ok: false, error: "A 5-digit US postal code is required to check freight." };
  }

  const city = String(input.city || "").trim();
  const state = String(input.state || "").trim();
  if (city.length > MAX_CITY_LENGTH || state.length > MAX_STATE_LENGTH) {
    return { ok: false, error: "Enter a shorter city and state to check freight." };
  }

  const quote = palletCalculator(input, catalog);
  if (!quote.ok) return quote;

  const boxCount = quote.freightBoxCount;
  const weightLbs = quote.weightLbs != null && quote.weightLbs > 0 ? quote.weightLbs : 0;
  const eligibility = evalShippingEligibility(postalCode, city, state, boxCount);
  const method = eligibility.options[0];
  const methodId = eligibility.defaultMethodId;

  return {
    ok: true,
    region: eligibility.region,
    boxCount,
    weightLbs,
    freeDeliveryEligible: eligibility.freeDeliveryEligible,
    boxesToUnlock: eligibility.boxesToUnlock,
    methodId,
    methodLabel: method?.label || "Shipping",
    estimatedShippingUsd: estimateShippingCost(methodId, weightLbs, boxCount),
    notice: eligibility.notice,
    banner: eligibility.banner,
  };
}
