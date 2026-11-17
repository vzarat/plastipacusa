import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PACKAGING_SPECS_CSV_HEADERS, packagingSpecsCsv } from "./packaging-specs-csv";
import type { AdminProduct } from "@/types/product";

function product(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    id: "film-15",
    slug: "stretch-film-15-x-40-ga-x-1500ft",
    name: "STRETCH FILM 15\" x 40 GA x 1500 FT",
    storefrontTitle: "",
    partNumber: "15-40-1500",
    description: "",
    gauge: 40,
    widthInches: 15,
    lengthFeet: 1500,
    rollsPerBox: 4,
    rollWeightLbs: 4.5,
    palletWeightLbs: 951.52,
    palletDimensions: "48 x 40 x 68",
    priceUsd: 21.2,
    price1Box: 28.21,
    price16Boxes: null,
    price32Boxes: null,
    price64Boxes: 21.2,
    priceCase: null,
    priceHalfPallet: null,
    pricePallet: null,
    price6Rolls: 0,
    price12Rolls: 0,
    price20Rolls: 0,
    price40Rolls: 0,
    packageTiers: [
      { sku: "BOX", label: "1", price: 28.21, boxesCount: 1, rollsCount: 4, boxWeightLbs: 18.99 },
      {
        sku: "FULL",
        label: "48",
        price: 21.2,
        boxesCount: 48,
        rollsCount: 192,
        palletWeightLbs: 951.52,
      },
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

function machineProduct(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    ...product({
      id: "machine-80",
      slug: "stretch-film-20-x-80-ga-x-5000ft",
      name: 'GENESIS Machine Film 20" x 80 GA x 5000 FT',
      partNumber: "HPF-SF208050",
      gauge: 80,
      widthInches: 20,
      lengthFeet: 5000,
      rollsPerBox: 1,
      rollWeightLbs: 34.06142,
      palletWeightLbs: 1288.51,
      palletDimensions: "48 x 40 x 46",
      priceUsd: 56.46,
      price1Box: null,
      price64Boxes: null,
      price20Rolls: 1129.2,
      price40Rolls: 1901.2,
      packageTiers: [],
      application: "machine",
      categorySlug: "genesis-standard",
    }),
    ...overrides,
  };
}

describe("packaging specs csv", () => {
  it("exports the hand-film 1-box + full-pallet weights, tare, dimensions, and prices", () => {
    const csv = packagingSpecsCsv([product(), product({ id: "draft", isActive: false, name: "Hidden" })]);
    const [header, row] = csv.split("\r\n");
    assert.equal(header.split(",").length, PACKAGING_SPECS_CSV_HEADERS.length);
    assert.equal(csv.split("\r\n").length, 2);
    assert.match(row, /18\.99/);
    assert.match(row, /951\.5/);
    assert.match(row, /40\.00/);
    assert.match(row, /11 x 11 x 19\.5/);
    assert.match(row, /48 x 40 x 68/);
    assert.match(row, /2\.14/);
    assert.match(row, /75\.56/);
    assert.match(row, /28\.21/);
    assert.match(row, /1017\.60/);
    assert.match(row, /7\.01/);
    assert.doesNotMatch(csv, /Hidden/);
    assert.doesNotMatch(header, /16-Box/);
    assert.doesNotMatch(header, /32-Box/);
    assert.match(header, /Full Pallet Volume \(CBM\)/);
  });

  it("keeps Full Pallet SKU aligned and drops duplicate Automatic ghosts", () => {
    const csv = packagingSpecsCsv([
      machineProduct(),
      machineProduct({
        id: "ghost-80-a",
        slug: "stretch-film-20-x-80-ga-x-5000ft-copy",
        name: 'STRETCH FILM 20" X 80 GA X 5000FT',
      }),
      machineProduct({
        id: "ghost-80-b",
        slug: "legacy-80",
        name: 'STRETCH FILM 20" X 80 GA X 5000FT',
      }),
    ]);
    const lines = csv.split("\r\n");
    assert.equal(lines.length, 2);
    assert.match(
      lines[1],
      /HPF-SF208050-HLP,48 x 40 x 46,707\.3,20,56\.46,1129\.20,HPF-SF208050-FLP,1288\.5/
    );
    assert.match(lines[1], /GENESIS Machine Film/);
    assert.doesNotMatch(csv, /STRETCH FILM 20/);
  });
});
