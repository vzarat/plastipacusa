import { isExcludedFifteenInchEightyGauge } from "@/lib/palletizing";
import { OFFICIAL_MACHINE_FILM_SPECS } from "@/lib/products";
import { validateCatalogSpec } from "@/lib/assistant/packaging-rules";
import type { AssistantResult, FilmKind } from "@/lib/assistant/types";

export type LoadProfile = "light" | "standard" | "heavy" | "sharp";

export interface GaugeAdviceInput {
  film: FilmKind;
  widthInches: 15 | 18 | 20;
  load: LoadProfile;
  lengthFeet?: number;
}

export interface GaugeAdvice {
  film: FilmKind;
  widthInches: number;
  load: LoadProfile;
  recommendedGauge: number;
  reason: string;
  catalog: Array<{ gauge: number; lengthFeet: number; title: string }>;
}

const MACHINE_GAUGE_FOR_LOAD: Record<LoadProfile, number> = {
  light: 51,
  standard: 70,
  heavy: 70,
  sharp: 80,
};

const HAND_GAUGE_FOR_LOAD: Record<LoadProfile, number> = {
  light: 60,
  standard: 70,
  heavy: 80,
  sharp: 80,
};

function catalogForGauge(gauge: number, lengthFeet?: number) {
  return OFFICIAL_MACHINE_FILM_SPECS.filter((spec) => spec.gauge === gauge)
    .filter((spec) => lengthFeet == null || spec.length === lengthFeet)
    .map((spec) => ({
      gauge: spec.gauge,
      lengthFeet: spec.length,
      title: `20" × ${spec.gauge} GA × ${spec.length.toLocaleString("en-US")} ft`,
    }));
}

export function gaugeAdvice(input: GaugeAdviceInput): AssistantResult<GaugeAdvice> {
  const spec = validateCatalogSpec(input);
  if (!spec.ok) return spec;
  const lengthFeet = spec.lengthFeet;
  const width = input.widthInches;
  if (input.film === "machine" && width !== 20) {
    return {
      ok: false,
      error: 'Machine film gauge advice applies to 20" film only. Hand film is 15" or 18".',
    };
  }
  if (input.film === "hand" && width === 20) {
    return {
      ok: false,
      error: '20" film is machine film. Ask for machine gauge advice instead of hand film.',
    };
  }
  if (input.film === "hand" && width !== 15 && width !== 18) {
    return { ok: false, error: 'Hand film is available in 15" and 18" widths.' };
  }

  if (input.film === "machine") {
    const recommendedGauge = MACHINE_GAUGE_FOR_LOAD[input.load];
    return {
      ok: true,
      film: "machine",
      widthInches: 20,
      load: input.load,
      recommendedGauge,
      reason:
        input.load === "light"
          ? "A stable, uniform load can use the lighter 51 GA machine film."
          : input.load === "standard"
            ? "Everyday pallet loads match the 70 GA machine film in the catalog."
            : input.load === "heavy"
              ? "Heavier loads match the 70 GA machine film in the catalog."
              : "Sharp edges or abrasive loads match the 80 GA machine film in the catalog.",
      catalog: catalogForGauge(recommendedGauge, lengthFeet),
    };
  }

  let recommendedGauge = HAND_GAUGE_FOR_LOAD[input.load];
  let reason =
    recommendedGauge === 60
      ? "Stable hand-wrap loads match 60 GA."
      : recommendedGauge === 70
        ? "Mixed hand-wrap loads match 70 GA."
        : "Heavy or sharp hand-wrap loads match 80 GA.";

  if (
    width === 15 &&
    isExcludedFifteenInchEightyGauge({ widthInches: 15, gauge: recommendedGauge })
  ) {
    recommendedGauge = 70;
    reason =
      '15" × 80 GA is not in the active catalog. Use 70 GA for heavy or sharp 15" hand-wrap loads.';
  }

  const handLengths =
    width === 15 ? [1500] : lengthFeet != null ? [lengthFeet] : [1000, 1500];

  return {
    ok: true,
    film: "hand",
    widthInches: width,
    load: input.load,
    recommendedGauge,
    reason,
    catalog: handLengths.map((lengthFeet) => ({
      gauge: recommendedGauge,
      lengthFeet,
      title: `${width}" × ${recommendedGauge} GA × ${lengthFeet.toLocaleString("en-US")} ft`,
    })),
  };
}
