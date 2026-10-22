import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handFilmSkuAliases, handFilmTierSku } from "./hand-film-sku";

describe("hand film SKUs", () => {
  it("builds the standard 18 x 80 x 1000 tiers without a hyphen after SF", () => {
    const spec = {
      categorySlug: "force-standard",
      widthInches: 18,
      gauge: 80,
      lengthFeet: 1000,
    };
    assert.equal(handFilmTierSku({ ...spec, boxes: 1 }), "STD-SF188010-1B");
    assert.equal(handFilmTierSku({ ...spec, boxes: 16 }), "STD-SF188010-16B");
    assert.equal(handFilmTierSku({ ...spec, boxes: 32 }), "STD-SF188010-32B");
  });

  it("puts a hyphen between the quality and SF", () => {
    assert.equal(
      handFilmTierSku({
        categorySlug: "force-standard",
        widthInches: 18,
        gauge: 70,
        lengthFeet: 1500,
        boxes: 32,
      }),
      "STD-SF187015-32B"
    );
  });

  it("builds the elite 18 x 70 x 1500 tiers", () => {
    const spec = {
      series: "FORCE Elite",
      widthInches: 18,
      gauge: 70,
      lengthFeet: 1500,
    };
    assert.equal(handFilmTierSku({ ...spec, boxes: 1 }), "ELT-SF187015-1B");
    assert.equal(handFilmTierSku({ ...spec, boxes: 16 }), "ELT-SF187015-16B");
    assert.equal(handFilmTierSku({ ...spec, boxes: 32 }), "ELT-SF187015-32B");
  });

  it("maps a saved FEL cart sku to the current elite catalog sku", () => {
    assert.deepEqual(handFilmSkuAliases("FEL-154015-1B"), ["FEL-154015-1B", "ELT-SF154015-1B"]);
    assert.deepEqual(handFilmSkuAliases("ELT-SF154015-64B"), [
      "ELT-SF154015-64B",
      "FEL-154015-64B",
    ]);
    assert.deepEqual(handFilmSkuAliases("STD-SF188010-1B"), ["STD-SF188010-1B"]);
  });
});
