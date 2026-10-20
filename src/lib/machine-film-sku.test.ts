import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { machineFilmTierSku } from "./machine-film-sku";

describe("machine film SKUs", () => {
  it("builds the four official pallet SKUs without a box suffix", () => {
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 51, lengthFeet: 7000, rolls: 20 }),
      "HPFSF205170-HLP"
    );
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 51, lengthFeet: 7000, rolls: 40 }),
      "HPFSF205170-FLP"
    );
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 51, lengthFeet: 9000, rolls: 20 }),
      "HPFSF205190-HLP"
    );
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 51, lengthFeet: 9000, rolls: 40 }),
      "HPFSF205190-FLP"
    );
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 70, lengthFeet: 5000, rolls: 20 }),
      "HPFSF207050-HLP"
    );
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 70, lengthFeet: 5000, rolls: 40 }),
      "HPFSF207050-FLP"
    );
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 80, lengthFeet: 5000, rolls: 20 }),
      "HPFSF208050-HLP"
    );
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 80, lengthFeet: 5000, rolls: 40 }),
      "HPFSF208050-FLP"
    );
  });

  it("does not assign a box tier or an unofficial spec", () => {
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 51, lengthFeet: 7000, rolls: 1 }),
      null
    );
    assert.equal(
      machineFilmTierSku({ widthInches: 20, gauge: 60, lengthFeet: 5000, rolls: 20 }),
      null
    );
  });
});
