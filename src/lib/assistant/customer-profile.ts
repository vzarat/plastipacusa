import { z } from "zod";
import { CATALOG_GAUGES } from "@/lib/assistant/packaging-rules";

export const PROFILE_WIDTHS = [15, 18, 20] as const;
export type ProfileWidth = (typeof PROFILE_WIDTHS)[number];
export type ProfileGauge = (typeof CATALOG_GAUGES)[number];

export interface CustomerProfile {
  usa_maquina: boolean | null;
  ancho: ProfileWidth | null;
  pallets_por_dia: number | null;
  dias_al_mes: number | null;
  calibre: ProfileGauge | null;
}

export const updateCustomerProfileInputSchema = z
  .object({
    usa_maquina: z.boolean().optional(),
    ancho: z.union([z.literal(15), z.literal(18), z.literal(20)]).optional(),
    pallets_por_dia: z.number().int().min(1).max(2000).optional(),
    dias_al_mes: z.number().int().min(1).max(31).optional(),
    calibre: z
      .union([
        z.literal(CATALOG_GAUGES[0]),
        z.literal(CATALOG_GAUGES[1]),
        z.literal(CATALOG_GAUGES[2]),
        z.literal(CATALOG_GAUGES[3]),
      ])
      .optional(),
  })
  .strict();

export type CustomerProfilePatch = z.infer<typeof updateCustomerProfileInputSchema>;

export function emptyCustomerProfile(): CustomerProfile {
  return {
    usa_maquina: null,
    ancho: null,
    pallets_por_dia: null,
    dias_al_mes: null,
    calibre: null,
  };
}

export function missingProfileFields(profile: CustomerProfile): string[] {
  const missing: string[] = [];
  if (profile.usa_maquina == null) missing.push("usa_maquina");
  if (profile.ancho == null) missing.push("ancho");
  if (profile.usa_maquina === true && profile.pallets_por_dia == null) missing.push("pallets_por_dia");
  if (profile.usa_maquina === true && profile.dias_al_mes == null) missing.push("dias_al_mes");
  if (profile.calibre == null) missing.push("calibre");
  return missing;
}

export function applyCustomerProfilePatch(
  current: CustomerProfile,
  patch: unknown
): { ok: true; profile: CustomerProfile } | { ok: false; error: string } {
  const parsed = updateCustomerProfileInputSchema.safeParse(patch);
  if (!parsed.success) {
    return { ok: false, error: "That profile update is not allowed." };
  }
  const next: CustomerProfile = { ...current };
  const fields = parsed.data;
  if (fields.usa_maquina !== undefined) next.usa_maquina = fields.usa_maquina;
  if (fields.ancho !== undefined) next.ancho = fields.ancho;
  if (fields.pallets_por_dia !== undefined) next.pallets_por_dia = fields.pallets_por_dia;
  if (fields.dias_al_mes !== undefined) next.dias_al_mes = fields.dias_al_mes;
  if (fields.calibre !== undefined) next.calibre = fields.calibre;
  return { ok: true, profile: next };
}
