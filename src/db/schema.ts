import { pgTable, text, varchar, serial, numeric, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const applicationEnum = pgEnum("application_type", ["hand", "machine"]);
export const inquiryStatusEnum = pgEnum("inquiry_status", ["new", "contacted", "quoted", "closed"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 100 }).notNull().default("Plastipac USA"),
  description: text("description").notNull(),
  shortDescription: varchar("short_description", { length: 500 }).notNull(),
  application: applicationEnum("application").notNull(),
  filmType: varchar("film_type", { length: 100 }).notNull().default("Cast Film"),
  color: varchar("color", { length: 50 }).notNull().default("Clear"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  techSheetUrl: text("tech_sheet_url"),
  imageUrl: text("image_url").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  recommendedUsage: text("recommended_usage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  packageSize: varchar("package_size", { length: 255 }),
  widthInches: numeric("width_inches", { precision: 5, scale: 2 }).notNull(),
  gauge: integer("gauge").notNull(),
  lengthFeet: integer("length_feet").notNull(),
  rollsPerBox: integer("rolls_per_box").notNull().default(4),
  rollsPerPallet: integer("rolls_per_pallet").notNull().default(256),
  weightLbs: numeric("weight_lbs", { precision: 6, scale: 2 }).notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  casePriceUsd: numeric("case_price_usd", { precision: 10, scale: 2 }),
  palletPriceUsd: numeric("pallet_price_usd", { precision: 10, scale: 2 }),
  stockStatus: varchar("stock_status", { length: 50 }).notNull().default("in_stock"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  monthlyPalletVolume: varchar("monthly_pallet_volume", { length: 100 }).notNull(),
  productInterest: varchar("product_interest", { length: 255 }),
  selectedSku: varchar("selected_sku", { length: 100 }),
  estimatedQuantity: integer("estimated_quantity"),
  unitType: varchar("unit_type", { length: 50 }).default("pallets"),
  shippingZip: varchar("shipping_zip", { length: 20 }),
  message: text("message"),
  status: inquiryStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
