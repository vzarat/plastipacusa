import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveManualFilmWeights,
  HAND_CARTON_KG,
  HAND_WOODEN_PALLET_TARE_LBS,
  KG_TO_LB,
  MANUAL_FILM_MASTER,
} from "./manual-film-master";
import { assertManualFilmRateTotals, MANUAL_FILM_OFFICIAL_RATES } from "./manual-film-rates";

describe("manual film Excel master weights", () => {
  it("derives box and pallet lbs from roll kg with carton + 40 lb tare", () => {
    const weights = deriveManualFilmWeights(3.928);
    assert.equal(weights.rollWeightLbs, 8.66);
    assert.equal(
      weights.boxWeightLbs,
      Math.round((3.928 * 4 + HAND_CARTON_KG) * KG_TO_LB * 100) / 100
    );
    assert.equal(
      weights.fullPalletWeightLbs,
      Math.round((weights.boxWeightLbs * 48 + HAND_WOODEN_PALLET_TARE_LBS) * 100) / 100
    );
    assert.equal(HAND_WOODEN_PALLET_TARE_LBS, 40);
  });

  it("keeps published pricing totals and 15/18 pallet footprints", () => {
    assertManualFilmRateTotals();
    assert.equal(MANUAL_FILM_OFFICIAL_RATES.length, 8);
    assert.equal(MANUAL_FILM_MASTER.length, 11);
    const fifteen = MANUAL_FILM_MASTER.filter((row) => row.widthInches === 15);
    const eighteen = MANUAL_FILM_MASTER.filter((row) => row.widthInches === 18);
    assert.ok(fifteen.every((row) => row.palletDimensions === "48 x 40 x 68"));
    assert.ok(eighteen.every((row) => row.palletDimensions === "48 x 48 x 78"));
  });
});
