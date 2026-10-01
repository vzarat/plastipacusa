/**
 * Row shapes for the live Supabase `products` and `product_variants` tables.
 */
export interface ProductRow {
  id: string;
  category_id: string | null;
  title: string;
  slug: string;
  type: string | null;
  width_inches: number | null;
  gauge: number | null;
  length_feet: number | null;
  rolls_per_box: number | null;
  description: string | null;
  images: string[] | null;
  is_featured: boolean | null;
  part_number: string | null;
  is_sold_out: boolean | null;
  is_active: boolean | null;
  roll_weight_lbs: number | null;
  pallet_weight_lbs: number | null;
  pallet_dimensions: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariantRow {
  id: string;
  product_id: string;
  sku: string;
  title: string | null;
  rolls_count: number | null;
  boxes_count: number | null;
  price: number | null;
  stock_quantity: number | null;
  roll_weight_lbs: number | null;
  box_weight_lbs: number | null;
  pallet_weight_lbs: number | null;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: ProductRow;
        Insert: Partial<ProductRow>;
        Update: Partial<ProductRow>;
      };
      product_variants: {
        Row: ProductVariantRow;
        Insert: Partial<ProductVariantRow>;
        Update: Partial<ProductVariantRow>;
      };
    };
  };
}
