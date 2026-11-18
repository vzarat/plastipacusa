import {
  findMachineFilmMaster,
  MACHINE_FILM_MASTER,
  MACHINE_PALLET_DIMENSIONS,
  machineFilmPackageTotal,
  machineFilmTierSkuFor,
} from "@/lib/machine-film-master";
import { HAND_WOODEN_PALLET_LBS, packageTotalWeightLbs } from "@/lib/package-weight";
import { HAND_FULL_PALLET_BOXES, quoteTierPrice, roundMoney } from "@/lib/pricing";
import { freightVolumeFromInches, handHandlingUnit } from "@/lib/shipping/hand-freight";
import type { AdminPackageTier, AdminProduct } from "@/types/product";

const HAND_TIERS = [
  { boxes: 1, rolls: 4, key: "box" },
  { boxes: HAND_FULL_PALLET_BOXES, rolls: 192, key: "full" },
] as const;

const MACHINE_PALLET_UNIT = { lengthIn: 48, widthIn: 40, heightIn: 46 };

export const PACKAGING_SPECS_CSV_HEADERS = [
  "Product SKU",
  "Product Title",
  "Application",
  "Width (in)",
  "Gauge",
  "Length (ft)",
  "Rolls per Box",
  "Box SKU",
  "Box Dimensions (L x W x H in)",
  "Box Weight (lbs)",
  "Box Rolls",
  "Box Price per Box (USD)",
  "Box Package Total (USD)",
  "Full Pallet SKU",
  "Full Pallet Weight (lbs)",
  "Full Pallet Wooden Tare (lbs)",
  "Full Pallet Dimensions (L x W x H in)",
  "Full Pallet Volume (CBM)",
  "Full Pallet Volume (cu ft)",
  "Full Pallet Price per Box (USD)",
  "Full Pallet Package Total (USD)",
  "Full Pallet Discount vs Standard (USD)",
  "Standard Price per Box (USD)",
  "Package Volume",
] as const;

function positive(value: unknown): number | null {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function firstPositive(values: unknown[]): number | null {
  for (const value of values) {
    const amount = positive(value);
    if (amount != null) return amount;
  }
  return null;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function money(value: number | null): string {
  if (value == null) return "";
  return roundMoney(value).toFixed(2);
}

function weightCell(value: number | null): string {
  if (value == null) return "";
  const digits = value >= 100 ? 1 : 2;
  return value.toFixed(digits);
}

function inches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function dimensionLabel(unit: { lengthIn: number; widthIn: number; heightIn: number }): string {
  return `${inches(unit.lengthIn)} x ${inches(unit.widthIn)} x ${inches(unit.heightIn)}`;
}

function tierFor(product: AdminProduct, boxes: number): AdminPackageTier | undefined {
  return (product.packageTiers || []).find((tier) => Math.floor(Number(tier.boxesCount) || 0) === boxes);
}

function rateFor(product: AdminProduct, boxes: number): number | null {
  const fromTier = positive(tierFor(product, boxes)?.price);
  if (fromTier != null) return fromTier;
  if (boxes === 1) return positive(product.price1Box);
  if (boxes === HAND_FULL_PALLET_BOXES || boxes === 64) return positive(product.price64Boxes);
  return null;
}

function sharedWeights(product: AdminProduct) {
  const tiers = product.packageTiers || [];
  return {
    roll: firstPositive([product.rollWeightLbs, ...tiers.map((tier) => tier.rollWeightLbs)]),
    box: firstPositive(tiers.map((tier) => tier.boxWeightLbs)),
    pallet: firstPositive([product.palletWeightLbs, ...tiers.map((tier) => tier.palletWeightLbs)]),
  };
}

function tierWeight(product: AdminProduct, boxes: number, rolls: number): number | null {
  const weights = sharedWeights(product);
  const machine = product.application === "machine";
  return packageTotalWeightLbs({
    boxes,
    rolls,
    rollWeightLbs: weights.roll,
    boxWeightLbs: weights.box,
    palletWeightLbs: weights.pallet,
    machine,
    widthInches: product.widthInches,
    gauge: product.gauge,
    lengthFeet: product.lengthFeet,
  });
}

function packageVolume(product: AdminProduct): string {
  if (product.application === "machine") {
    return "Half Pallet (20 Rolls) / Full Pallet (40 Rolls)";
  }
  return "1 Box / Full Pallet (48 boxes)";
}

function productSku(product: AdminProduct): string {
  if (product.application === "machine") {
    const master = findMachineFilmMaster(product);
    if (master) return machineFilmTierSkuFor(master, 40);
  }
  return (
    tierFor(product, HAND_FULL_PALLET_BOXES)?.sku ||
    tierFor(product, 64)?.sku ||
    tierFor(product, 1)?.sku ||
    product.partNumber ||
    product.slug
  );
}

function machineCsvCells(product: AdminProduct): Array<string | number | null> {
  const master = findMachineFilmMaster(product);
  const halfSku = master ? machineFilmTierSkuFor(master, 20) : "";
  const fullSku = master ? machineFilmTierSkuFor(master, 40) : "";
  const halfWeight = master
    ? master.halfPalletWeightLbs
    : packageTotalWeightLbs({
        rolls: 20,
        machine: true,
        rollWeightLbs: product.rollWeightLbs,
        widthInches: product.widthInches,
        gauge: product.gauge,
        lengthFeet: product.lengthFeet,
      });
  const fullWeight = master
    ? master.fullPalletWeightLbs
    : packageTotalWeightLbs({
        rolls: 40,
        machine: true,
        rollWeightLbs: product.rollWeightLbs,
        palletWeightLbs: product.palletWeightLbs,
        widthInches: product.widthInches,
        gauge: product.gauge,
        lengthFeet: product.lengthFeet,
      });
  const halfTotal = master ? machineFilmPackageTotal(master, 20) : positive(product.price20Rolls);
  const fullTotal = master ? machineFilmPackageTotal(master, 40) : positive(product.price40Rolls);
  const halfPerRoll = halfTotal != null ? roundMoney(halfTotal / 20) : null;
  const fullPerRoll = fullTotal != null ? roundMoney(fullTotal / 40) : null;
  const volume = freightVolumeFromInches(MACHINE_PALLET_UNIT);
  const dims =
    String(product.palletDimensions || "").trim() || MACHINE_PALLET_DIMENSIONS.replace(/x/gi, "x");
  // Half pallet reuses the shared "Box *" columns; Full Pallet SKU must come next.
  return [
    halfSku,
    dims.includes("x") ? dims.replace(/\s*x\s*/gi, " x ") : dimensionLabel(MACHINE_PALLET_UNIT),
    weightCell(halfWeight),
    20,
    money(halfPerRoll),
    money(halfTotal),
    fullSku,
    weightCell(fullWeight),
    master?.palletTareLbs != null ? weightCell(master.palletTareLbs) : "",
    dimensionLabel(MACHINE_PALLET_UNIT),
    volume ? volume.cbm.toFixed(2) : "",
    volume ? volume.cubicFeet.toFixed(2) : "",
    money(fullPerRoll),
    money(fullTotal),
    halfPerRoll != null && fullPerRoll != null ? money(roundMoney(halfPerRoll - fullPerRoll)) : "",
  ];
}

function syntheticMachineCatalogProduct(
  row: (typeof MACHINE_FILM_MASTER)[number]
): AdminProduct {
  const halfTotal = machineFilmPackageTotal(row, 20);
  const fullTotal = machineFilmPackageTotal(row, 40);
  return {
    id: `master-${row.slug}`,
    slug: row.slug,
    name: row.title,
    storefrontTitle: `GENESIS Machine Film ${row.title.replace(/^STRETCH FILM\s+/i, "")}`,
    partNumber: row.partNumber,
    description: "",
    gauge: row.gauge,
    widthInches: row.widthInches,
    lengthFeet: row.lengthFeet,
    rollsPerBox: 1,
    rollWeightLbs: row.rollWeightLbs,
    palletWeightLbs: row.fullPalletWeightLbs,
    palletDimensions: MACHINE_PALLET_DIMENSIONS,
    priceUsd: fullTotal,
    price1Box: null,
    price16Boxes: null,
    price32Boxes: null,
    price64Boxes: null,
    priceCase: null,
    priceHalfPallet: halfTotal,
    pricePallet: fullTotal,
    price6Rolls: 0,
    price12Rolls: 0,
    price20Rolls: halfTotal,
    price40Rolls: fullTotal,
    packageTiers: [],
    stockQuantity: 0,
    isSoldOut: false,
    application: "machine",
    categorySlug: "genesis-high-performance",
    imageUrl: "",
    images: [],
    isActive: true,
  };
}

/** Prefer GENESIS / official-slug Automatic rows; always emit the 4 masters with roll×count totals. */
function catalogProductsForCsv(products: AdminProduct[]): AdminProduct[] {
  const active = products.filter((product) => product.isActive);
  const hand: AdminProduct[] = [];
  const machineByMaster = new Map<string, AdminProduct>();

  const machineScore = (product: AdminProduct): number => {
    const name = `${product.storefrontTitle || ""} ${product.name || ""}`.toLowerCase();
    const slug = String(product.slug || "").toLowerCase();
    let score = 0;
    if (name.includes("genesis")) score += 8;
    if (
      slug === "stretch-film-20-x-51-ga-x-7000ft" ||
      slug === "stretch-film-20-x-51-ga-x-9000ft" ||
      slug === "stretch-film-20-x-70-ga-x-5000ft" ||
      slug === "stretch-film-20-x-80-ga-x-5000ft"
    ) {
      score += 10;
    }
    if (product.partNumber) score += 2;
    return score;
  };

  for (const product of active) {
    if (product.application !== "machine") {
      hand.push(product);
      continue;
    }
    const master = findMachineFilmMaster(product);
    if (!master) continue;
    const existing = machineByMaster.get(master.slug);
    if (!existing || machineScore(product) > machineScore(existing)) {
      machineByMaster.set(master.slug, {
        ...product,
        price20Rolls: machineFilmPackageTotal(master, 20),
        price40Rolls: machineFilmPackageTotal(master, 40),
        priceHalfPallet: machineFilmPackageTotal(master, 20),
        pricePallet: machineFilmPackageTotal(master, 40),
        priceUsd: machineFilmPackageTotal(master, 40),
      });
    }
  }

  return [
    ...hand,
    ...MACHINE_FILM_MASTER.map(
      (row) => machineByMaster.get(row.slug) ?? syntheticMachineCatalogProduct(row)
    ),
  ];
}

export function packagingSpecsCsv(products: AdminProduct[]): string {
  const rows = catalogProductsForCsv(products).map((product) => {
    const machine = product.application === "machine";
    const standard = machine
      ? findMachineFilmMaster(product)?.halfPerRoll ?? positive(product.priceUsd)
      : rateFor(product, 1) ?? positive(product.priceUsd);
    const cells: Array<string | number | null> = [
      productSku(product),
      product.storefrontTitle || product.name,
      product.application,
      product.widthInches ?? "",
      product.gauge ?? "",
      product.lengthFeet ?? "",
      machine ? 1 : product.rollsPerBox ?? 4,
    ];

    if (machine) {
      cells.push(...machineCsvCells(product));
    } else {
      for (const tier of HAND_TIERS) {
        const rate = rateFor(product, tier.boxes);
        const gross = tierWeight(product, tier.boxes, tier.rolls);
        const unit = handHandlingUnit(tier.boxes, product.widthInches, product.palletDimensions);
        const total = rate != null ? quoteTierPrice(rate, tier.boxes).total : null;
        const discount =
          standard != null && rate != null ? roundMoney(standard - rate) : null;
        cells.push(tierFor(product, tier.boxes)?.sku || "");
        if (tier.key === "box") {
          cells.push(unit ? dimensionLabel(unit) : "", weightCell(gross), tier.rolls, money(rate), money(total));
        } else {
          const volume = unit ? freightVolumeFromInches(unit) : null;
          cells.push(
            weightCell(gross),
            gross != null ? weightCell(HAND_WOODEN_PALLET_LBS) : "",
            unit ? dimensionLabel(unit) : "",
            volume ? volume.cbm.toFixed(2) : "",
            volume ? volume.cubicFeet.toFixed(2) : "",
            money(rate),
            money(total),
            money(discount)
          );
        }
      }
    }

    cells.push(money(standard), packageVolume(product));
    return cells;
  });

  return [PACKAGING_SPECS_CSV_HEADERS, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\r\n");
}
