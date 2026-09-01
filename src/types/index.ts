import { Product as DbProduct, ProductVariant as DbProductVariant, Inquiry as DbInquiry, NewInquiry as DbNewInquiry } from "@/db/schema";

export type ApplicationType = "hand" | "machine";

export interface ProductWithVariants extends DbProduct {
  variants: DbProductVariant[];
}

export type Product = DbProduct;
export type ProductVariant = DbProductVariant;
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
  variantId: number;
  sku: string;
  widthInches: string;
  gauge: number;
  lengthFeet: number;
  rollsPerBox: number;
  rollsPerPallet: number;
  weightLbs: string;
  pricingTier: string;
  unitPrice: number;
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
