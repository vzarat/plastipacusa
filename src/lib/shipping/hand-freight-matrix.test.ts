import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatHandMatrixDimensions,
  formatHandMatrixWeight,
  handMatrixDimensions,
  handMatrixWeightLbs,
  storedOneBoxDimensions,
} from "./hand-freight";

describe("hand film specs matrix", () => {
  it("adds a 10 in pallet deck and weighs pallet tiers from the box plus 29.18 lb", () => {
    const box = handMatrixDimensions(1);
    const layer = handMatrixDimensions(16);
    const half = handMatrixDimensions(32);
    const full = handMatrixDimensions(64, "48 x 48 x 66");
    assert.equal(formatHandMatrixDimensions(box), '11" W x 11" L x 19.5" H');
    assert.equal(
      storedOneBoxDimensions(1, '11" W x 11" L x 16.5" H'),
      '11" W x 11" L x 16.5" H'
    );
    assert.equal(storedOneBoxDimensions(16, '11" W x 11" L x 16.5" H'), null);
    assert.equal(formatHandMatrixDimensions(handMatrixDimensions(1, null, 15)), '11" W x 11" L x 16.5" H');
    assert.equal(formatHandMatrixDimensions(handMatrixDimensions(1, null, 18)), '11" W x 11" L x 19.5" H');
    assert.equal(formatHandMatrixDimensions(layer), '48" W x 48" L x 29.5" H');
    assert.equal(formatHandMatrixDimensions(half), '48" W x 48" L x 49.0" H');
    assert.equal(formatHandMatrixDimensions(full), '48" W x 48" L x 66.0" H');
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(1, 18, 1175.74)), "18.00 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(16, 18, 1175.74)), "317.18 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(32, 18, 1175.74)), "605.18 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(64, 18, 1175.74)), "1,175.74 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(1, 25.13, 1637.5)), "25.13 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(16, 25.13, 1637.5)), "431.26 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(32, 25.13, 1637.5)), "833.34 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(64, 25.13, 1637.5)), "1,637.50 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(1, 21.68, 1416.88)), "21.68 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(16, 21.68, 1416.88)), "376.06 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(32, 21.68, 1416.88)), "722.94 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(64, 21.68, 1416.88)), "1,416.88 lbs");
  });
});
