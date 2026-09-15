export * from "./index";

/**
 * Admin-facing product management types used by the Product Management UI
 * (list view, edit/create form, and image upload flow).
 */
export const GAUGE_OPTIONS = [45, 50, 60, 63, 70, 75, 80, 90, 100, 120] as const;

export interface AdminProduct {
  id: number;
  slug: string;
  name: string;
  partNumber: string;
  description: string;
  gauge: number | null;
  priceUsd: number | null;
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
  partNumber: string;
  description: string;
  gauge: number | null;
  priceUsd: number | null;
  stockQuantity: number;
  application: "hand" | "machine";
  categorySlug: string;
  imageUrl: string;
  images: string[];
  isActive: boolean;
}

