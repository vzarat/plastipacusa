import { z } from "zod";
import { updateCustomerProfileInputSchema } from "@/lib/assistant/customer-profile";
import { missingProfileFields } from "@/lib/assistant/customer-profile";
import { freightRateCheck } from "@/lib/assistant/freight-rate";
import { lookupCatalogPrice } from "@/lib/assistant/catalog-price";
import { palletCalculator } from "@/lib/assistant/pallet-calculator";
import { readCustomerProfile, writeCustomerProfile } from "@/lib/assistant/profile-store";
import { recommendProduct, usageFromProfile } from "@/lib/assistant/recommend-product";
import {
  summarizeFreight,
  summarizeQuote,
  summarizeRecommendation,
  summarizeUsage,
} from "@/lib/assistant/wizard-summary";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const wizardRequestSchema = updateCustomerProfileInputSchema
  .extend({
    action: z.enum(["save", "usage", "recommend", "pallet", "freight"]),
    postalCode: z.string().regex(/^\d{5}$/).optional(),
    city: z.string().trim().max(80).optional(),
    state: z.string().trim().max(32).optional(),
  })
  .strict();

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return Response.json({ error: "Sign in to use Assist AI." }, { status: 401 });
  }
  const profile = readCustomerProfile(user.id);
  return Response.json({ profile, missing: missingProfileFields(profile) });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return Response.json({ error: "Sign in to use Assist AI." }, { status: 401 });
  }

  const parsed = wizardRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "That step is not available." }, { status: 400 });
  }

  const { action, postalCode, city, state, ...patch } = parsed.data;
  const saved = writeCustomerProfile(user.id, patch);
  if (!saved.ok) {
    return Response.json({ error: saved.error }, { status: 400 });
  }
  const profile = saved.profile;

  if (action === "save") {
    return Response.json({ profile, missing: missingProfileFields(profile), summary: "Saved." });
  }

  if (action === "usage") {
    const result = usageFromProfile(profile);
    return Response.json({ profile, result, summary: summarizeUsage(result) });
  }

  if (action === "recommend") {
    const result = recommendProduct(profile);
    return Response.json({ profile, result, summary: summarizeRecommendation(result) });
  }

  const recommendation = recommendProduct(profile);
  if (!recommendation.ok) {
    return Response.json({ profile, result: recommendation, summary: summarizeRecommendation(recommendation) });
  }

  const catalog = await lookupCatalogPrice({
    widthInches: recommendation.widthInches,
    gauge: recommendation.gauge,
  });
  const packageInput = {
    film: recommendation.film,
    widthInches: recommendation.widthInches,
    tier: recommendation.tier,
    quantity: recommendation.quantity,
    gauge: recommendation.gauge,
  };

  if (action === "pallet") {
    const result = palletCalculator(packageInput, catalog);
    return Response.json({ profile, result, summary: summarizeQuote(result) });
  }

  if (!postalCode) {
    return Response.json({
      profile,
      result: { ok: false, error: "A 5-digit US postal code is required to check freight." },
      summary: "A 5-digit US postal code is required to check freight.",
    });
  }
  const result = freightRateCheck({ ...packageInput, postalCode, city, state }, catalog);
  return Response.json({ profile, result, summary: summarizeFreight(result) });
}
