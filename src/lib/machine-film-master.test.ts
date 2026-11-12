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
  });

  it("prices Tarima 20 and Tarima 40 from the master spreadsheet", () => {
    const row = findMachineFilmMaster({ widthInches: 20, gauge: 51, lengthFeet: 7000 });
    assert.ok(row);
    assert.equal(machineFilmPerRollPrice({ ...row, rolls: 20 }), 50.84);
    assert.equal(machineFilmPerRollPrice({ ...row, rolls: 40 }), 42.53);
    assert.equal(machineFilmPackageTotal(row!, 20), 1016.8);
    assert.equal(machineFilmPackageTotal(row!, 40), 1701.2);
    assert.equal(machineFilmPackagePrice({ widthInches: 20, gauge: 80, lengthFeet: 5000, rolls: 40 }), 1901.2);
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
