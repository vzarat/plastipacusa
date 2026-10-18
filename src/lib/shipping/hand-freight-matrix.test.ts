import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatHandMatrixDimensions,
  formatHandMatrixWeight,
  handMatrixDimensions,
  handMatrixWeightLbs,
} from "./hand-freight";

describe("hand film specs matrix", () => {
  it("adds a 10 in pallet deck and splits the stored pallet weight", () => {
    const box = handMatrixDimensions(1);
    const layer = handMatrixDimensions(16);
    const half = handMatrixDimensions(32);
    const full = handMatrixDimensions(64, "48 x 48 x 66");
    assert.equal(formatHandMatrixDimensions(box), '12" W x 12" L x 19.5" H');
    assert.equal(formatHandMatrixDimensions(layer), '48" W x 48" L x 29.5" H');
    assert.equal(formatHandMatrixDimensions(half), '48" W x 48" L x 49.0" H');
    assert.equal(formatHandMatrixDimensions(full), '48" W x 48" L x 66.0" H');
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(1, 18, 1175.74)), "18.00 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(16, 18, 1175.74)), "293.94 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(32, 18, 1175.74)), "587.87 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(64, 18, 1175.74)), "1,175.74 lbs");
  });
});
