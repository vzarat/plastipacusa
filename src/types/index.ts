import { Product as DbProduct, ProductVariant as DbProductVariant, Inquiry as DbInquiry, NewInquiry as DbNewInquiry } from "@/db/schema";

export type ApplicationType = "hand" | "machine";

export interface ProductVariant extends Omit<DbProductVariant, "id"> {
  id: any;
  title?: string;
  rolls_count?: number;
  boxes_count?: number;
  rollsCount?: number;
  boxesCount?: number;
}

export interface ProductWithVariants extends Omit<DbProduct, "name"> {
  title: string;
  name?: string;
  variants: ProductVariant[];
  categorySlug?: string;
  categoryId?: string;
  category?: any;
  startingPrice?: number;
  widthInches?: number;
  width_inches?: string;
  gauge?: number;
  length_feet?: number;
  core_type?: string;
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
