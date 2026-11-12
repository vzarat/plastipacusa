import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatFreightVolume,
  formatHandFullPalletDimensionsWithVolume,
  formatHandMatrixDimensions,
  formatHandMatrixWeight,
  freightVolumeFromInches,
  HAND_BOX_CM,
  HAND_BOX_SKYDROPX_M,
  HAND_FULL_PALLET_DIMENSIONS_15,
  HAND_FULL_PALLET_DIMENSIONS_18,
  HAND_FULL_PALLET_VOLUME_15,
  HAND_FULL_PALLET_VOLUME_18,
  handFullPalletVolume,
  handMatrixDimensions,
  handMatrixWeightLbs,
  resolveHandFullPalletDims,
  storedOneBoxDimensions,
} from "./hand-freight";

describe("hand film specs matrix", () => {
  it("publishes Manual full-pallet CBM and cu ft for Warp LTL density", () => {
    assert.equal(HAND_FULL_PALLET_VOLUME_15.cbm, 2.14);
    assert.equal(HAND_FULL_PALLET_VOLUME_15.cubicFeet, 75.56);
    assert.equal(HAND_FULL_PALLET_VOLUME_18.cbm, 2.95);
    assert.equal(HAND_FULL_PALLET_VOLUME_18.cubicFeet, 104);
    assert.equal(formatFreightVolume(HAND_FULL_PALLET_VOLUME_15), "2.14 CBM (75.56 cu ft)");
    assert.equal(formatFreightVolume(HAND_FULL_PALLET_VOLUME_18), "2.95 CBM (104.00 cu ft)");
    assert.equal(handFullPalletVolume({ widthInches: 15 }).cbm, 2.14);
    assert.equal(handFullPalletVolume({ widthInches: 18 }).cbm, 2.95);
    assert.equal(
      formatHandFullPalletDimensionsWithVolume({ lengthIn: 48, widthIn: 40, heightIn: 68 }),
      '40" W x 48" L x 68.0" H · 2.14 CBM (75.56 cu ft)'
    );
    assert.deepEqual(
      freightVolumeFromInches({ lengthIn: 48, widthIn: 48, heightIn: 78 }),
      HAND_FULL_PALLET_VOLUME_18
    );
  });

  it("uses width-specific full-pallet dimensions for Manual film", () => {
    const box = handMatrixDimensions(1);
    const full18 = handMatrixDimensions(48, HAND_FULL_PALLET_DIMENSIONS_18, 18);
    const full15 = handMatrixDimensions(48, HAND_FULL_PALLET_DIMENSIONS_15, 15);
    assert.equal(formatHandMatrixDimensions(box), '11" W x 11" L x 19.5" H');
    assert.equal(
      storedOneBoxDimensions(1, '11" W x 11" L x 16.5" H'),
      '11" W x 11" L x 16.5" H'
    );
    assert.equal(storedOneBoxDimensions(48, '11" W x 11" L x 16.5" H'), null);
    assert.equal(formatHandMatrixDimensions(handMatrixDimensions(1, null, 15)), '11" W x 11" L x 19.5" H');
    assert.equal(formatHandMatrixDimensions(handMatrixDimensions(1, null, 18)), '11" W x 11" L x 19.5" H');
    assert.equal(HAND_BOX_SKYDROPX_M.widthM, 0.28);
    assert.equal(HAND_BOX_SKYDROPX_M.lengthM, 0.28);
    assert.equal(HAND_BOX_SKYDROPX_M.heightM, 0.5);
    assert.deepEqual(HAND_BOX_CM, { widthCm: 27.94, lengthCm: 27.94, heightCm: 49.53 });
    assert.equal(formatHandMatrixDimensions(full18), '48" W x 48" L x 78.0" H');
    assert.equal(formatHandMatrixDimensions(full15), '40" W x 48" L x 68.0" H');
    assert.deepEqual(resolveHandFullPalletDims({ widthInches: 15 }), {
      lengthIn: 48,
      widthIn: 40,
      heightIn: 68,
    });
    assert.deepEqual(resolveHandFullPalletDims({ widthInches: 18 }), {
      lengthIn: 48,
      widthIn: 48,
      heightIn: 78,
    });
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(1, 18.99, 951.52)), "18.99 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(48, 18.99, 951.52)), "951.52 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(1, 22.67, 1128.16)), "22.67 lbs");
    assert.equal(formatHandMatrixWeight(handMatrixWeightLbs(48, 22.67, 1128.16)), "1,128.16 lbs");
  });
});
