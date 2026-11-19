import { machineFilmPackagePriceBySku } from "@/lib/machine-film-pricing";
import { HAND_FULL_PALLET_BOXES, quoteTierPrice, roundMoney } from "@/lib/pricing";
import type { SalesQuoteLineInput, SalesQuoteTierKey } from "./types";

export interface QuoteCatalogProduct {
  id: string;
  slug: string;
  name: string;
  application: "hand" | "machine";
  widthInches: string;
  gauge: number;
  lengthFeet: number;
  imageUrl?: string;
  options: QuoteCatalogOption[];
}

export interface QuoteCatalogOption {
  tierKey: SalesQuoteTierKey;
  tierLabel: string;
  sku: string;
  boxesPerPackage: number;
  rollsPerPackage: number;
  unitPrice: number;
  boxUnitPrice: number | null;
  weightLbs: number | null;
}

function positive(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

/** Build Manual (1 box / full pallet) and Automatic (half / full) options for the quote form. */
export function buildQuoteCatalogOptions(
  products: Array<Record<string, unknown>>
): QuoteCatalogProduct[] {
  const catalog: QuoteCatalogProduct[] = [];

  for (const product of products) {
    const application =
      String(product.application || "").toLowerCase() === "machine" ? "machine" : "hand";
    const id = String(product.id || product.sourceId || "");
    const slug = String(product.slug || "");
    const name = String(product.name || product.title || slug || "Stretch Film");
    const widthInches = String(product.widthInches ?? product.width_inches ?? "");
    const gauge = Math.round(Number(product.gauge) || 0);
    const lengthFeet = Math.round(Number(product.lengthFeet ?? product.length_feet) || 0);
    const imageUrl = String(product.imageUrl || product.image_url || "");
    const variants = [
      ...(Array.isArray(product.variants) ? (product.variants as Record<string, unknown>[]) : []),
      ...(Array.isArray(product.product_variants)
        ? (product.product_variants as Record<string, unknown>[])
        : []),
      ...(Array.isArray(product.packageTiers)
        ? (product.packageTiers as Record<string, unknown>[])
        : []),
    ];

    const optionRows = (row: Record<string, unknown>) => ({
      sku: String(row.sku || ""),
      boxes: Math.floor(
        Number(row.boxes_count ?? row.boxesCount ?? row.boxes ?? 0) || 0
      ),
      rolls: Math.round(
        Number(row.rolls_count ?? row.rollsCount ?? row.rolls ?? row.rollsPerBox ?? 0) || 0
      ),
      price: positive(row.price ?? row.price_usd ?? row.priceUsd),
      boxWeight: positive(row.box_weight_lbs ?? row.boxWeightLbs ?? row.weightLbs),
      palletWeight: positive(
        row.pallet_weight_lbs ?? row.palletWeightLbs ?? row.weightLbs
      ),
    });

    const options: QuoteCatalogOption[] = [];

    if (application === "machine") {
      for (const rolls of [20, 40] as const) {
        const variant = variants
          .map(optionRows)
          .find(
            (row) =>
              Boolean(row.sku) &&
              (row.rolls === rolls ||
                (rolls === 20 && /HLP|20R/i.test(row.sku)) ||
                (rolls === 40 && /FLP|40R|FULL/i.test(row.sku)))
          );
        if (!variant?.sku) continue;
        const unitPrice =
          machineFilmPackagePriceBySku(variant.sku) ?? variant.price ?? 0;
        if (!(unitPrice > 0)) continue;
        options.push({
          tierKey: rolls === 20 ? "half" : "full",
          tierLabel: rolls === 20 ? "Half Pallet (20 rolls)" : "Full Pallet (40 rolls)",
          sku: variant.sku,
          boxesPerPackage: 0,
          rollsPerPackage: rolls,
          unitPrice: roundMoney(unitPrice),
          boxUnitPrice: null,
          weightLbs: variant.palletWeight,
        });
      }
    } else {
      const mapped = variants.map(optionRows);
      const boxVariant = mapped.find(
        (row) =>
          Boolean(row.sku) &&
          (row.boxes === 1 || row.rolls === 4 || /-(1)B$/i.test(row.sku))
      );
      const fullVariant = mapped.find(
        (row) =>
          Boolean(row.sku) &&
          (row.boxes === HAND_FULL_PALLET_BOXES ||
            row.boxes === 64 ||
            row.rolls === 192 ||
            row.rolls === 256 ||
            /-(48|64)B$|FULL/i.test(row.sku))
      );

      if (boxVariant?.sku && boxVariant.price) {
        options.push({
          tierKey: "box",
          tierLabel: "1 Box (4 rolls)",
          sku: boxVariant.sku,
          boxesPerPackage: 1,
          rollsPerPackage: 4,
          unitPrice: roundMoney(boxVariant.price),
          boxUnitPrice: roundMoney(boxVariant.price),
          weightLbs: boxVariant.boxWeight,
        });
      }

      if (fullVariant?.sku && fullVariant.price) {
        const priced = quoteTierPrice(fullVariant.price, HAND_FULL_PALLET_BOXES, 1);
        options.push({
          tierKey: "full",
          tierLabel: `Full Pallet (${HAND_FULL_PALLET_BOXES} boxes / 192 rolls)`,
          sku: fullVariant.sku,
          boxesPerPackage: HAND_FULL_PALLET_BOXES,
          rollsPerPackage: 192,
          unitPrice: priced.total,
          boxUnitPrice: priced.pricePerBox,
          weightLbs: fullVariant.palletWeight,
        });
      }
    }

    if (!id || options.length === 0) continue;
    catalog.push({
      id,
      slug,
      name,
      application,
      widthInches,
      gauge,
      lengthFeet,
      imageUrl: imageUrl || undefined,
      options,
    });
  }

  return catalog.sort((a, b) => a.name.localeCompare(b.name));
}

export function toSalesQuoteLineInput(
  product: QuoteCatalogProduct,
  option: QuoteCatalogOption,
  quantity: number
): SalesQuoteLineInput {
  return {
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    application: product.application,
    sku: option.sku,
    tierKey: option.tierKey,
    tierLabel: option.tierLabel,
    widthInches: product.widthInches,
    gauge: product.gauge,
    lengthFeet: product.lengthFeet,
    quantity,
    boxesPerPackage: option.boxesPerPackage,
    rollsPerPackage: option.rollsPerPackage,
    unitPrice: option.unitPrice,
    boxUnitPrice: option.boxUnitPrice,
    weightLbs: option.weightLbs,
    productImage: product.imageUrl,
  };
}
