import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateUsage } from "@/lib/assistant/estimate-usage";
import { freightRateCheck } from "@/lib/assistant/freight-rate";
import { gaugeAdvice } from "@/lib/assistant/gauge-advice";
import { palletCalculator, type CatalogPrice } from "@/lib/assistant/pallet-calculator";
import { USAGE_RATES } from "@/lib/assistant/usage-rates";
import {
  estimateUsageInputSchema,
  freightRateInputSchema,
  palletCalculatorInputSchema,
} from "@/lib/assistant/tools";

const boxCatalog: CatalogPrice = {
  boxPrice: 40,
  halfPalletPrice: null,
  fullPalletPrice: null,
  rollWeightLbs: null,
  sku: null,
};

describe("palletCalculator", () => {
  it("rejects a second machine half pallet", () => {
    const result = palletCalculator({
      film: "machine",
      widthInches: 20,
      tier: "half_pallet",
      quantity: 2,
      gauge: 70,
      lengthFeet: 5000,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Half Pallet is limited to 1/);
    }
  });

  it("quotes one machine half pallet", () => {
    const result = palletCalculator({
      film: "machine",
      widthInches: 20,
      tier: "half_pallet",
      quantity: 1,
      gauge: 70,
      lengthFeet: 5000,
      series: "standard",
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.rolls, 20);
  });

  it("rejects machine film boxes and layers", () => {
    for (const tier of ["box", "layer"] as const) {
      const result = palletCalculator({
        film: "machine",
        widthInches: 20,
        tier,
        quantity: 1,
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.match(result.error, /Half Pallet/);
    }
  });

  it("does not fall back to a Genesis price when product variants have no price", () => {
    const result = palletCalculator({
      film: "machine",
      widthInches: 20,
      tier: "full_pallet",
      quantity: 2,
      gauge: 70,
      lengthFeet: 5000,
      series: "standard",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rolls, 80);
      assert.equal(result.price, "price_unavailable");
      assert.equal(result.unitPrice, null);
      assert.equal(result.totalPrice, null);
    }
  });

  it("prices machine film only from the variant price passed in by the server", () => {
    const catalog: CatalogPrice = {
      boxPrice: 1,
      halfPalletPrice: 50,
      fullPalletPrice: 90,
      rollWeightLbs: null,
      sku: "GEN-207050-FP",
    };
    const result = palletCalculator(
      {
        film: "machine",
        widthInches: 20,
        tier: "full_pallet",
        quantity: 2,
        gauge: 70,
        lengthFeet: 5000,
      },
      catalog
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.price, 90);
      assert.equal(result.unitPrice, 90);
      assert.equal(result.totalPrice, 180);
    }
  });

  it("rejects machine film that is not 20 inches", () => {
    const result = palletCalculator({
      film: "machine",
      widthInches: 18,
      tier: "full_pallet",
      quantity: 1,
    });
    assert.equal(result.ok, false);
  });

  it("blocks 16 hand-film boxes", () => {
    const result = palletCalculator({
      film: "hand",
      widthInches: 18,
      tier: "box",
      quantity: 16,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /1 Layer/);
    }
  });

  it("allows 15 hand-film boxes using a catalog box price", () => {
    const result = palletCalculator(
      {
        film: "hand",
        widthInches: 15,
        tier: "box",
        quantity: 15,
      },
      boxCatalog
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.boxes, 15);
      assert.equal(result.totalPrice, 600);
    }
  });

  it("quotes one hand-film layer and rejects a second", () => {
    const one = palletCalculator({ film: "hand", widthInches: 18, tier: "layer", quantity: 1 }, boxCatalog);
    const two = palletCalculator({ film: "hand", widthInches: 18, tier: "layer", quantity: 2 });
    assert.equal(one.ok, true);
    if (one.ok) {
      assert.equal(one.boxes, 16);
      assert.equal(one.totalPrice, 608);
    }
    assert.equal(two.ok, false);
  });

  it("quotes one hand half pallet and rejects a second", () => {
    const one = palletCalculator(
      { film: "hand", widthInches: 18, tier: "half_pallet", quantity: 1 },
      boxCatalog
    );
    const two = palletCalculator({ film: "hand", widthInches: 15, tier: "half_pallet", quantity: 2 });
    assert.equal(one.ok, true);
    if (one.ok) {
      assert.equal(one.boxes, 32);
      assert.equal(one.rolls, 128);
    }
    assert.equal(two.ok, false);
    if (!two.ok) assert.match(two.error, /Half Pallet is limited to 1/);
  });

  it("quotes a hand full pallet above one unit", () => {
    const result = palletCalculator(
      { film: "hand", widthInches: 18, tier: "full_pallet", quantity: 2 },
      boxCatalog
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.boxes, 128);
      assert.equal(result.rolls, 512);
    }
  });

  it("rejects hand film requested at 20 inches", () => {
    const result = palletCalculator({
      film: "hand",
      widthInches: 20,
      tier: "full_pallet",
      quantity: 1,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /machine film/);
  });

  it("rejects invalid quantities, gauges, and lengths", () => {
    const cases = [
      { quantity: 0 },
      { quantity: 1.5 },
      { quantity: -1 },
      { quantity: 41 },
      { gauge: 63 },
      { lengthFeet: 50 },
      { lengthFeet: 20000 },
    ];
    for (const extra of cases) {
      const result = palletCalculator({
        film: "hand",
        widthInches: 18,
        tier: "box",
        quantity: 1,
        ...extra,
      });
      assert.equal(result.ok, false, JSON.stringify(extra));
    }
  });
});

const FORBIDDEN_FIELDS = [
  "boxUnitPrice",
  "boxCount",
  "weightLbs",
  "userId",
  "role",
  "price",
  "discount",
] as const;

describe("tool schemas", () => {
  const palletBase = {
    film: "machine" as const,
    widthInches: 20 as const,
    tier: "full_pallet" as const,
    quantity: 1,
    gauge: 70 as const,
    lengthFeet: 5000,
  };
  const freightBase = {
    film: "hand" as const,
    widthInches: 18 as const,
    tier: "box" as const,
    quantity: 1,
    postalCode: "77002",
    city: "Houston",
    state: "TX",
  };

  for (const field of FORBIDDEN_FIELDS) {
    it(`palletCalculator schema rejects ${field}`, () => {
      const parsed = palletCalculatorInputSchema.safeParse({ ...palletBase, [field]: 1 });
      assert.equal(parsed.success, false);
    });

    it(`freightRateCheck schema rejects ${field}`, () => {
      const parsed = freightRateInputSchema.safeParse({ ...freightBase, [field]: 1 });
      assert.equal(parsed.success, false);
    });
  }

  it("ignores smuggled prices when quoting a package", () => {
    const catalog: CatalogPrice = {
      boxPrice: null,
      halfPalletPrice: null,
      fullPalletPrice: 90,
      rollWeightLbs: null,
      sku: null,
    };
    const clean = palletCalculator(palletBase, catalog);
    const poisoned = palletCalculator(
      {
        ...palletBase,
        boxUnitPrice: 1,
        price: 1,
        discount: 0.99,
        userId: "user-1",
        role: "admin",
      } as typeof palletBase,
      catalog
    );
    assert.equal(clean.ok, true);
    assert.equal(poisoned.ok, true);
    if (clean.ok && poisoned.ok) {
      assert.equal(poisoned.unitPrice, clean.unitPrice);
      assert.equal(poisoned.totalPrice, 90);
      assert.notEqual(poisoned.unitPrice, 1);
    }
  });

  it("does not unlock free freight from a smuggled box count or weight", () => {
    const clean = freightRateCheck(freightBase);
    const poisoned = freightRateCheck({
      ...freightBase,
      boxCount: 64,
      weightLbs: 0,
      boxUnitPrice: 0,
      price: 0,
      discount: 1,
      userId: "user-1",
      role: "admin",
    } as typeof freightBase);
    assert.equal(clean.ok, true);
    assert.equal(poisoned.ok, true);
    if (clean.ok && poisoned.ok) {
      assert.equal(poisoned.freeDeliveryEligible, false);
      assert.equal(poisoned.boxCount, clean.boxCount);
      assert.equal(poisoned.boxCount, 1);
      assert.equal(poisoned.estimatedShippingUsd, clean.estimatedShippingUsd);
      assert.ok(poisoned.estimatedShippingUsd > 0);
    }
  });

  it("accepts a legal package and a five-digit postal code", () => {
    const parsed = freightRateInputSchema.safeParse({
      film: "hand",
      widthInches: 18,
      tier: "layer",
      quantity: 1,
      postalCode: "78501",
      city: "McAllen",
      state: "TX",
    });
    assert.equal(parsed.success, true);
  });
});

describe("estimateUsage", () => {
  it("rejects rates, prices, and identity on the schema", () => {
    for (const field of ["rollsPerWrappedPallet", "poundsPerPallet", "price", "userId", "role", "discount"]) {
      const parsed = estimateUsageInputSchema.safeParse({
        method: "machine",
        widthInches: 20,
        palletsPerDay: 10,
        daysPerMonth: 20,
        [field]: 5,
      });
      assert.equal(parsed.success, false, field);
    }
  });

  it("counts machine pallets and does not invent film per pallet", () => {
    const result = estimateUsage({
      method: "machine",
      widthInches: 20,
      palletsPerDay: 10,
      daysPerMonth: 20,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.palletsPerDay, 10);
      assert.equal(result.palletsPerMonth, 200);
      assert.equal(result.rollsPerMonth, null);
      assert.equal(result.poundsPerMonth, null);
      assert.equal(result.usage, "usage_unavailable");
    }
  });

  it("uses a configured wrap rate and ignores a rate smuggled on the input", () => {
    const input = {
      method: "machine" as const,
      widthInches: 20 as const,
      palletsPerDay: 10,
      daysPerMonth: 20,
      rollsPerWrappedPallet: 99,
    };
    const result = estimateUsage(input, { ...USAGE_RATES, machineRollsPerWrappedPallet: 2 });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rollsPerDay, 20);
      assert.equal(result.rollsPerMonth, 400);
      assert.equal(result.usage, "calculated");
      assert.notEqual(result.rollsPerMonth, 99 * 200);
    }
  });

  it("asks instead of calculating when a machine figure is missing", () => {
    const result = estimateUsage({ method: "machine", widthInches: 20, palletsPerDay: 10 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(result.missing, ["daysPerMonth"]);
      assert.equal("palletsPerMonth" in result, false);
    }
  });

  it("converts hand-film boxes with the package ladder", () => {
    const result = estimateUsage({
      method: "hand",
      widthInches: 18,
      monthlyUnit: "boxes",
      monthlyAmount: 15,
      daysPerMonth: 20,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rollsPerMonth, 60);
      assert.equal(result.boxesPerMonth, 15);
      assert.equal(result.rollsPerDay, 3);
      assert.equal(result.rateSource, "hand-package-ladder");
    }
  });

  it("does not round leftover hand-film rolls into boxes", () => {
    const result = estimateUsage({
      method: "hand",
      monthlyUnit: "rolls",
      monthlyAmount: 10,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rollsPerMonth, 10);
      assert.equal(result.boxesPerMonth, null);
      assert.equal(result.rollsPerDay, null);
    }
  });
});

describe("gaugeAdvice", () => {
  it("does not recommend 80 GA for 15 inch film", () => {
    const result = gaugeAdvice({ film: "hand", widthInches: 15, load: "sharp" });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.recommendedGauge, 70);
  });

  it("recommends 80 GA machine film for sharp loads", () => {
    const result = gaugeAdvice({ film: "machine", widthInches: 20, load: "sharp" });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.recommendedGauge, 80);
      assert.ok(result.catalog.length > 0);
    }
  });

  it("rejects a length outside the catalog range", () => {
    const result = gaugeAdvice({
      film: "machine",
      widthInches: 20,
      load: "standard",
      lengthFeet: 40000,
    });
    assert.equal(result.ok, false);
  });
});

describe("freightRateCheck", () => {
  it("includes RGV delivery for one hand-film layer", () => {
    const result = freightRateCheck({
      postalCode: "78501",
      city: "McAllen",
      state: "TX",
      film: "hand",
      widthInches: 18,
      tier: "layer",
      quantity: 1,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.boxCount, 16);
      assert.equal(result.freeDeliveryEligible, true);
      assert.equal(result.estimatedShippingUsd, 0);
    }
  });

  it("requires a full pallet before Houston freight is free", () => {
    const result = freightRateCheck({
      postalCode: "77002",
      city: "Houston",
      state: "TX",
      film: "hand",
      widthInches: 18,
      tier: "half_pallet",
      quantity: 1,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.boxCount, 32);
      assert.equal(result.freeDeliveryEligible, false);
      assert.ok(result.estimatedShippingUsd > 0);
    }
  });

  it("returns a rule error instead of a rate for 16 boxes", () => {
    const result = freightRateCheck({
      postalCode: "78501",
      city: "McAllen",
      state: "TX",
      film: "hand",
      widthInches: 18,
      tier: "box",
      quantity: 16,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /1 Layer/);
  });

  it("rejects an invalid postal code", () => {
    const result = freightRateCheck({
      postalCode: "785",
      film: "hand",
      widthInches: 18,
      tier: "box",
      quantity: 1,
    });
    assert.equal(result.ok, false);
  });
});
