import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalCatalogSku,
  catalogSkuCandidates,
  catalogSkusMatch,
  customerLineDescription,
} from "./catalog-sku";

describe("catalog SKU rename", () => {
  it("maps the previous hand prefixes onto the current SKU", () => {
    assert.equal(canonicalCatalogSku("FEL-154015-1B"), "ELT-SF154015-1B");
    assert.equal(canonicalCatalogSku("FST-188010-64B"), "STD-SF188010-64B");
    assert.equal(canonicalCatalogSku("ELT-SF154015-64B"), "ELT-SF154015-64B");
    assert.ok(catalogSkusMatch("FEL-154015-1B", "ELT-SF154015-1B"));
    assert.ok(catalogSkuCandidates("STD-SF188010-1B").includes("FST-188010-1B"));
  });

  it("maps the previous machine prefixes onto HPF-SF", () => {
    assert.equal(canonicalCatalogSku("HPFSF205170-HLP"), "HPF-SF205170-HLP");
    assert.equal(canonicalCatalogSku("FST-20517000-20R"), "HPF-SF205170-HLP");
    assert.equal(canonicalCatalogSku("FST-20705000-40R"), "HPF-SF207050-FLP");
    assert.equal(canonicalCatalogSku("genesis-machine-film-20-51-9000-40R"), "HPF-SF205190-FLP");
    assert.equal(canonicalCatalogSku("GEN-208050-20R"), "HPF-SF208050-HLP");
    assert.ok(catalogSkusMatch("HPFSF208050-FLP", "HPF-SF208050-FLP"));
  });

  it("shows the current SKU in a customer line and hides the saved code", () => {
    assert.equal(
      customerLineDescription({
        productName: 'STRETCH FILM 15" x 40 GA x 1500 FT',
        sku: "FEL-154015-1B",
      }),
      'STRETCH FILM 15" x 40 GA x 1500 FT · ELT-SF154015-1B'
    );
    assert.equal(
      customerLineDescription({ productName: "FEL-154015-64B", sku: "FEL-154015-64B" }),
      "ELT-SF154015-64B"
    );
    assert.equal(
      customerLineDescription({ productName: "Custom pallet", sku: "PL-PO-MANUAL-ADMIN" }),
      "Custom pallet"
    );
  });
});
