export * from "./index";

/**
 * Admin-facing product management types used by the Product Management UI
 * (list view, edit/create form, and image upload flow).
 */
export const GAUGE_OPTIONS = [45, 50, 60, 63, 70, 75, 80, 90, 100, 120] as const;

export const PACKAGE_TIER_DEFAULTS = {
  price6Rolls: 192.44,
  price12Rolls: 366.55,
  price20Rolls: 580.36,
  price40Rolls: 1099.64,
} as const;

export interface AdminProduct {
  id: number;
  slug: string;
  name: string;
  storefrontTitle: string;
  partNumber: string;
  description: string;
  gauge: number | null;
  priceUsd: number | null;
  priceCase: number | null;
  priceHalfPallet: number | null;
  pricePallet: number | null;
  price6Rolls: number;
  price12Rolls: number;
  price20Rolls: number;
  price40Rolls: number;
  stockQuantity: number;
  application: "hand" | "machine";
  categorySlug: string;
  imageUrl: string;
  images: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFormValues {
  id?: number;
  name: string;
  storefrontTitle: string;
  partNumber: string;
  description: string;
  gauge: number | null;
  priceUsd: number | null;
  priceCase: number | null;
  priceHalfPallet: number | null;
  pricePallet: number | null;
  price6Rolls: number;
  price12Rolls: number;
  price20Rolls: number;
  price40Rolls: number;
  stockQuantity: number;
  application: "hand" | "machine";
  categorySlug: string;
  imageUrl: string;
  images: string[];
  isActive: boolean;
}

