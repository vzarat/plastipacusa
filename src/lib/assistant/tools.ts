import { tool } from "ai";
import { z } from "zod";
import { lookupCatalogPrice } from "@/lib/assistant/catalog-price";
import { estimateUsage } from "@/lib/assistant/estimate-usage";
import { freightRateCheck } from "@/lib/assistant/freight-rate";
import { gaugeAdvice } from "@/lib/assistant/gauge-advice";
import { palletCalculator } from "@/lib/assistant/pallet-calculator";
import { USAGE_RATES } from "@/lib/assistant/usage-rates";
import {
  CATALOG_GAUGES,
  MAX_LENGTH_FEET,
  MAX_PACKAGE_QUANTITY,
  MIN_LENGTH_FEET,
} from "@/lib/assistant/packaging-rules";

const filmSchema = z.enum(["hand", "machine"]);
const tierSchema = z.enum(["box", "layer", "half_pallet", "full_pallet"]);
const widthSchema = z.union([z.literal(15), z.literal(18), z.literal(20)]);
const gaugeSchema = z.union([
  z.literal(CATALOG_GAUGES[0]),
  z.literal(CATALOG_GAUGES[1]),
  z.literal(CATALOG_GAUGES[2]),
  z.literal(CATALOG_GAUGES[3]),
]);
const lengthSchema = z.number().int().min(MIN_LENGTH_FEET).max(MAX_LENGTH_FEET);
const quantitySchema = z.number().int().min(1).max(MAX_PACKAGE_QUANTITY);

const packageFields = {
  film: filmSchema.describe("hand = 15 or 18 inch. machine = 20 inch."),
  widthInches: widthSchema.describe("Film width in inches."),
  tier: tierSchema.describe("box, layer, half_pallet, or full_pallet."),
  quantity: quantitySchema.describe("Number of packages, not individual rolls."),
  gauge: gaugeSchema.optional().describe("Catalog gauge: 51, 60, 70, or 80."),
  lengthFeet: lengthSchema.optional(),
  series: z.enum(["standard", "high_performance"]).optional(),
};

export const palletCalculatorInputSchema = z.object(packageFields).strict();

export const gaugeAdviceInputSchema = z
  .object({
    film: filmSchema,
    widthInches: widthSchema,
    load: z.enum(["light", "standard", "heavy", "sharp"]),
    lengthFeet: lengthSchema.optional(),
  })
  .strict();

export const estimateUsageInputSchema = z
  .object({
    method: z.enum(["machine", "hand"]),
    widthInches: widthSchema.optional(),
    palletsPerDay: z.number().int().min(1).max(2000).optional(),
    daysPerMonth: z.number().int().min(1).max(31).optional(),
    monthlyUnit: z.enum(["boxes", "rolls"]).optional(),
    monthlyAmount: z.number().int().min(1).max(100000).optional(),
  })
  .strict();

export const freightRateInputSchema = z
  .object({
    ...packageFields,
    postalCode: z.string().regex(/^\d{5}$/),
    city: z.string().trim().max(80).optional(),
    state: z.string().trim().max(32).optional(),
  })
  .strict();

function toolFailure() {
  return { ok: false as const, error: "That request could not be completed. Please try again." };
}

export const assistantTools = {
  palletCalculator: tool({
    description:
      "Calculate a valid Plastipac package. Enforces machine-film half/full pallet limits and hand-film box, layer, and half-pallet limits. Returns an error when the request breaks a rule. Prices come from the catalog, not from the conversation.",
    inputSchema: palletCalculatorInputSchema,
    execute: async (input) => {
      try {
        const catalog = await lookupCatalogPrice(input);
        return palletCalculator(input, catalog);
      } catch (error) {
        console.error("Assist AI pallet tool failed", error);
        return toolFailure();
      }
    },
  }),
  gaugeAdvice: tool({
    description:
      "Recommend a catalog gauge (GA) for a hand-wrap or machine-wrap load. Does not invent gauges outside the Plastipac catalog.",
    inputSchema: gaugeAdviceInputSchema,
    execute: async (input) => {
      try {
        return gaugeAdvice(input);
      } catch (error) {
        console.error("Assist AI gauge tool failed", error);
        return toolFailure();
      }
    },
  }),
  estimateUsage: tool({
    description:
      "Calculate daily and monthly film use from the buyer's figures and configured rates only. Returns an error listing missing fields instead of guessing. Machine wrap yield is usage_unavailable until a catalog rate exists.",
    inputSchema: estimateUsageInputSchema,
    execute: async (input) => {
      try {
        return estimateUsage(input, USAGE_RATES);
      } catch (error) {
        console.error("Assist AI usage tool failed", error);
        return toolFailure();
      }
    },
  }),
  freightRateCheck: tool({
    description:
      "Check RGV, Houston, and out-of-region freight for a valid package. Weight and box count come from the catalog and packaging rules. Returns an error instead of a rate when the package breaks a rule.",
    inputSchema: freightRateInputSchema,
    execute: async (input) => {
      try {
        const catalog = await lookupCatalogPrice(input);
        return freightRateCheck(input, catalog);
      } catch (error) {
        console.error("Assist AI freight tool failed", error);
        return toolFailure();
      }
    },
  }),
};
