import type { CustomerProfile } from "@/lib/assistant/customer-profile";
import type { EstimateUsageInput, EstimateUsageResult } from "@/lib/assistant/estimate-usage";
import { estimateUsage } from "@/lib/assistant/estimate-usage";
import type { AssistantResult, FilmKind, PackageTier } from "@/lib/assistant/types";

export interface ProductRecommendation {
  film: FilmKind;
  widthInches: 15 | 18 | 20;
  gauge: number;
  tier: PackageTier;
  quantity: 1;
  reason: string;
}

export function usageInputFromProfile(profile: CustomerProfile): EstimateUsageInput | null {
  if (profile.usa_maquina == null) return null;
  return {
    method: profile.usa_maquina ? "machine" : "hand",
    widthInches: profile.ancho ?? undefined,
    palletsPerDay: profile.pallets_por_dia ?? undefined,
    daysPerMonth: profile.dias_al_mes ?? undefined,
  };
}

export function usageFromProfile(profile: CustomerProfile): EstimateUsageResult {
  const input = usageInputFromProfile(profile);
  if (!input) {
    return {
      ok: false,
      error: "Ask whether the buyer wraps by machine or by hand.",
      missing: ["usa_maquina"],
    };
  }
  return estimateUsage(input);
}

export function recommendProduct(profile: CustomerProfile): AssistantResult<ProductRecommendation> {
  const missing: string[] = [];
  if (profile.usa_maquina == null) missing.push("usa_maquina");
  if (profile.ancho == null) missing.push("ancho");
  if (profile.calibre == null) missing.push("calibre");
  if (missing.length > 0) {
    return { ok: false, error: "Ask for the missing profile fields before recommending a package." };
  }

  const width = profile.ancho;
  const gauge = profile.calibre;
  if (width == null || gauge == null || profile.usa_maquina == null) {
    return { ok: false, error: "Ask for the missing profile fields before recommending a package." };
  }

  if (profile.usa_maquina) {
    if (width !== 20) {
      return { ok: false, error: 'Machine film in the catalog is 20" only.' };
    }
    return {
      ok: true,
      film: "machine",
      widthInches: 20,
      gauge,
      tier: "half_pallet",
      quantity: 1,
      reason: "Machine film starts at one half pallet. A full pallet is the next tier.",
    };
  }

  if (width !== 15 && width !== 18) {
    return { ok: false, error: 'Hand film in the catalog is 15" or 18" only.' };
  }
  return {
    ok: true,
    film: "hand",
    widthInches: width,
    gauge,
    tier: "box",
    quantity: 1,
    reason: "Hand film starts at one box. A layer is the next tier.",
  };
}
