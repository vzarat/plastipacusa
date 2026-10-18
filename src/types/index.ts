import { Product as DbProduct, ProductVariant as DbProductVariant, Inquiry as DbInquiry, NewInquiry as DbNewInquiry } from "@/db/schema";
import type { BoxTierPrices } from "@/lib/pricing";

export type ApplicationType = "hand" | "machine";

export interface ProductVariant extends Omit<
  DbProductVariant,
  "id" | "rollWeightLbs" | "boxWeightLbs" | "palletWeightLbs"
> {
  id: any;
  title?: string;
  rolls_count?: number;
  boxes_count?: number;
  /** Per-box rate from product_variants.price. */
  price?: number | null;
  rollsCount?: number;
  boxesCount?: number;
  tierKey?: string;
  tierSubtext?: string;
  tierBadges?: string[];
  tierTag?: string;
  rollWeightLbs?: number | null;
  boxWeightLbs?: number | null;
  palletWeightLbs?: number | null;
}

export interface PackageOption {
  rolls: number;
  label: string;
  sku: string;
  /** One preset at quantity 1: unit box price × boxes in the preset. */
  price: number;
  boxes?: number;
  /** Supabase per-box price for this preset's volume bracket. */
  boxUnitPrice?: number;
}

export interface ProductWithVariants
  extends Omit<
    DbProduct,
    | "name"
    | "gauge"
    | "partNumber"
    | "priceUsd"
    | "stockQuantity"
    | "isActive"
    | "storefrontTitle"
    | "priceCase"
    | "priceHalfPallet"
    | "pricePallet"
    | "price6Rolls"
    | "price12Rolls"
    | "price20Rolls"
    | "price40Rolls"
    | "price1Box"
    | "price16Boxes"
    | "price32Boxes"
    | "price64Boxes"
    | "widthInches"
    | "lengthFeet"
    | "rollsPerBox"
    | "rollWeightLbs"
    | "palletWeightLbs"
    | "palletDimensions"
  > {
  title: string;
  name?: string;
  variants: ProductVariant[];
  categorySlug?: string;
  categoryId?: string;
  category?: any;
  startingPrice?: number;
  widthInches?: number;
  width_inches?: string;
  gauge?: number | null;
  length_feet?: number;
  palletDimensions?: string;
  pallet_dimensions?: string;
  core_type?: string;
  fullPalletRolls?: number;
  palletLayers?: number;
  rollsPerLayer?: number;
  rollsPerBoxSpec?: number;
  boxesPerFullPallet?: number;
  palletizingSummary?: string;
  palletizingFamily?: string;
  partNumber?: string | null;
  priceUsd?: number | null;
  stockQuantity?: number;
  isSoldOut: boolean;
  isActive?: boolean;
  storefrontTitle?: string | null;
  priceCase?: number | null;
  priceHalfPallet?: number | null;
  pricePallet?: number | null;
  price6Rolls?: number;
  price12Rolls?: number;
  price20Rolls?: number;
  price40Rolls?: number;
  packageOptions?: PackageOption[];
  /** Live per-box prices from price_1_box / price_16_boxes / price_32_boxes / price_64_boxes. */
  boxPrices?: BoxTierPrices;
  price_1_box?: number | null;
  price_16_boxes?: number | null;
  price_32_boxes?: number | null;
  price_64_boxes?: number | null;
  /** Exact featured-series label used for tab filtering (no partial matches). */
  series?: string;
}
export type Product = DbProduct;
export type Inquiry = DbInquiry;
export type NewInquiry = DbNewInquiry;

export interface CartItem {
  id: string; // Unique cart item ID: `${productId}-${variantId}-${pricingTier}`
  productId: number;
  productSlug: string;
  productName: string;
  productImage: string;
  packageSize?: string;
  totalRolls?: number;
  totalBoxes?: number;
  application: ApplicationType;
  variantId: any;
  sku: string;
  widthInches: string;
  gauge: number;
  lengthFeet: number;
  rollsPerBox: number;
  rollsPerPallet: number;
  weightLbs: string;
  pricingTier: string;
  /** half_pallet | layer | box | full_pallet */
  tierType?: string;
  /** Price of one selected preset (unit box price × boxes in that preset). */
  unitPrice: number;
  /** Applicable unit box price from the volume bracket. Hand film only. */
  boxUnitPrice?: number;
  quantity: number; // number of packages ordered
  totalPrice: number;
}

export interface InquiryFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  monthlyPalletVolume: string;
  productInterest?: string;
  selectedSku?: string;
  estimatedQuantity?: number;
  unitType?: string;
  shippingZip?: string;
  message?: string;
}

export interface ProductFilterState {
  application?: "all" | "hand" | "machine";
  gauge?: number[];
  widthInches?: string[];
  searchQuery?: string;
  sortBy?: "price-asc" | "price-desc" | "name" | "popular";
}
