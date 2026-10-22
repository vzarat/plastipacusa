import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  machineFilmPackagePrice,
  machineFilmPackagePriceBySku,
  machineFilmPerRollPrice,
} from "./machine-film-pricing";

describe("machine film roll prices", () => {
  it("prices each official 20 inch film by the roll, with no box tier", () => {
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 51, lengthFeet: 7000, rolls: 20 }), 50.84);
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 51, lengthFeet: 7000, rolls: 40 }), 42.53);
    assert.equal(machineFilmPackagePrice({ widthInches: 20, gauge: 51, lengthFeet: 7000, rolls: 20 }), 1016.8);
    assert.equal(machineFilmPackagePrice({ widthInches: 20, gauge: 51, lengthFeet: 7000, rolls: 40 }), 1701.2);
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 51, lengthFeet: 9000, rolls: 20 }), 64.16);
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 51, lengthFeet: 9000, rolls: 40 }), 54.39);
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 70, lengthFeet: 5000, rolls: 20 }), 49.93);
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 70, lengthFeet: 5000, rolls: 40 }), 41.71);
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 80, lengthFeet: 5000, rolls: 20 }), 56.46);
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 80, lengthFeet: 5000, rolls: 40 }), 47.53);
    assert.equal(machineFilmPerRollPrice({ widthInches: 20, gauge: 51, lengthFeet: 7000, rolls: 1 }), null);
    assert.equal(machineFilmPackagePriceBySku("HPF-SF207050-FLP"), 1668.4);
    assert.equal(machineFilmPackagePriceBySku("HPFSF208050-HLP"), 1129.2);
  });
});
