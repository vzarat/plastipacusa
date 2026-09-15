import { ProductWithVariants } from "@/types";

// Deprecated: product data is now sourced exclusively from Supabase (see src/actions/products.ts).
// Kept as an empty typed export so any stray imports fail loudly instead of resurrecting stale mock data.
export const FALLBACK_PRODUCTS: ProductWithVariants[] = [];
