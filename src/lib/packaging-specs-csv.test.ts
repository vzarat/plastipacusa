import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PACKAGING_SPECS_CSV_HEADERS, packagingSpecsCsv } from "./packaging-specs-csv";
import type { AdminProduct } from "@/types/product";

function product(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    id: "film-15",
    slug: "15-40-1500",
    name: "STRETCH FILM 15\" x 40 GA x 1500 FT",
    storefrontTitle: "",
    partNumber: "15-40-1500",
    description: "",
    gauge: 40,
    widthInches: 15,
    lengthFeet: 1500,
    rollsPerBox: 4,
    rollWeightLbs: null,
    palletWeightLbs: 1173.5,
    palletDimensions: "",
    priceUsd: 21.2,
    price1Box: 28.21,
    price16Boxes: 25.65,
    price32Boxes: 23.32,
    price64Boxes: 21.2,
    priceCase: null,
    priceHalfPallet: null,
    pricePallet: null,
    price6Rolls: 0,
    price12Rolls: 0,
    price20Rolls: 0,
    price40Rolls: 0,
    packageTiers: [
      { sku: "BOX", label: "1", price: 28.21, boxesCount: 1, rollsCount: 4, boxWeightLbs: 18 },
      { sku: "LAYER", label: "16", price: 25.65, boxesCount: 16, rollsCount: 64 },
      { sku: "HALF", label: "32", price: 23.32, boxesCount: 32, rollsCount: 128 },
      { sku: "FULL", label: "64", price: 21.2, boxesCount: 64, rollsCount: 256 },
    ],
    stockQuantity: 1,
    isSoldOut: false,
    application: "hand",
    categorySlug: "force-standard",
    imageUrl: "",
    images: [],
    isActive: true,
    ...overrides,
  };
}

describe("packaging specs csv", () => {
  it("exports the hand-film matrix weights, pallet tare, dimensions, and tier prices", () => {
    const csv = packagingSpecsCsv([product(), product({ id: "draft", isActive: false, name: "Hidden" })]);
    const [header, row] = csv.split("\r\n");
    assert.equal(header.split(",").length, PACKAGING_SPECS_CSV_HEADERS.length);
    assert.equal(csv.split("\r\n").length, 2);
    assert.match(row, /18\.00/);
    assert.match(row, /309\.9/);
    assert.match(row, /597\.8/);
    assert.match(row, /1173\.5/);
    assert.match(row, /22\.05/);
    assert.match(row, /12 x 12 x 19\.5/);
    assert.match(row, /48 x 48 x 78/);
    assert.match(row, /1356\.80/);
    assert.match(row, /2\.56/);
    assert.doesNotMatch(csv, /Hidden/);
  });
});
