import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findMachineFilmMaster,
  MACHINE_FILM_MASTER,
  MACHINE_FULL_PALLET_ROLLS,
  MACHINE_HALF_PALLET_ROLLS,
  MACHINE_PALLET_DIMENSIONS,
  machineFilmPackageTotal,
  machineFilmTierSkuFor,
} from "./machine-film-master";
import { machineFilmPackagePrice, machineFilmPerRollPrice } from "./machine-film-pricing";
import { packageTotalWeightLbs } from "./package-weight";

describe("machine film Automatic matrix", () => {
  it("keeps the four official 20 inch specs with 20/40-roll tiers", () => {
    assert.equal(MACHINE_FILM_MASTER.length, 4);
    assert.equal(MACHINE_HALF_PALLET_ROLLS, 20);
    assert.equal(MACHINE_FULL_PALLET_ROLLS, 40);
    assert.equal(MACHINE_PALLET_DIMENSIONS, "48 x 40 x 46");
    assert.deepEqual(
      MACHINE_FILM_MASTER.map((row) => [row.widthInches, row.gauge, row.lengthFeet]),
      [
        [20, 51, 7000],
        [20, 51, 9000],
        [20, 70, 5000],
        [20, 80, 5000],
      ]
    );
    assert.equal(
      MACHINE_FILM_MASTER.some((row) => row.lengthFeet === 6000 || row.gauge === 60),
      false
    );
  });

  it("prices Tarima 20 and Tarima 40 as per-roll × roll count (not ×48 boxes)", () => {
    const expected = [
      { gauge: 51, length: 7000, half: 1016.8, full: 1701.2, halfPer: 50.84, fullPer: 42.53 },
      { gauge: 51, length: 9000, half: 1283.2, full: 2175.6, halfPer: 64.16, fullPer: 54.39 },
      { gauge: 70, length: 5000, half: 998.6, full: 1668.4, halfPer: 49.93, fullPer: 41.71 },
      { gauge: 80, length: 5000, half: 1129.2, full: 1901.2, halfPer: 56.46, fullPer: 47.53 },
    ] as const;

    for (const spec of expected) {
      const row = findMachineFilmMaster({
        widthInches: 20,
        gauge: spec.gauge,
        lengthFeet: spec.length,
      });
      assert.ok(row, `${spec.gauge}/${spec.length}`);
      assert.equal(machineFilmPerRollPrice({ ...row!, rolls: 20 }), spec.halfPer);
      assert.equal(machineFilmPerRollPrice({ ...row!, rolls: 40 }), spec.fullPer);
      assert.equal(machineFilmPackageTotal(row!, 20), spec.half);
      assert.equal(machineFilmPackageTotal(row!, 40), spec.full);
      assert.equal(
        machineFilmPackagePrice({
          widthInches: 20,
          gauge: spec.gauge,
          lengthFeet: spec.length,
          rolls: 20,
        }),
        spec.half
      );
      assert.equal(
        machineFilmPackagePrice({
          widthInches: 20,
          gauge: spec.gauge,
          lengthFeet: spec.length,
          rolls: 40,
        }),
        spec.full
      );
      assert.equal(Math.round(spec.halfPer * 20 * 100) / 100, spec.half);
      assert.equal(Math.round(spec.fullPer * 40 * 100) / 100, spec.full);
    }

    const row = findMachineFilmMaster({ widthInches: 20, gauge: 51, lengthFeet: 7000 });
    assert.equal(machineFilmTierSkuFor(row!, 20), "HPF-SF205170-HLP");
    assert.equal(machineFilmTierSkuFor(row!, 40), "HPF-SF205170-FLP");
  });

  it("maps half/full pallet scale weights including wooden tare", () => {
    for (const row of MACHINE_FILM_MASTER) {
      assert.equal(
        packageTotalWeightLbs({
          rolls: 20,
          machine: true,
          widthInches: row.widthInches,
          gauge: row.gauge,
          lengthFeet: row.lengthFeet,
        }),
        row.halfPalletWeightLbs
      );
      assert.equal(
        packageTotalWeightLbs({
          rolls: 40,
          machine: true,
          widthInches: row.widthInches,
          gauge: row.gauge,
          lengthFeet: row.lengthFeet,
        }),
        row.fullPalletWeightLbs
      );
    }
  });
});
