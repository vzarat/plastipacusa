import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getProductBySlug } from "@/actions/products";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductDetail } from "@/components/products/ProductDetail";
import { SpecsTable } from "@/components/products/SpecsTable";
import { PalletizingSpecsPanel } from "@/components/products/PalletizingSpecsPanel";
import {
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { PRODUCT_CATEGORIES } from "@/data/categories";
import { resolvePalletizingSpecs } from "@/lib/palletizing";

export const revalidate = 3600;
export const dynamicParams = true;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const supabaseStatic =
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes("placeholder")
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function generateStaticParams() {
  try {
    if (supabaseStatic) {
      const { data: products, error } = await supabaseStatic
        .from("products")
        .select("slug");

      if (!error && products && products.length > 0) {
        return products
          .filter((product) => Boolean(product?.slug))
          .map((product) => ({
            slug: String(product.slug),
          }));
      }
    }
  } catch (error) {
    console.warn(
      "Supabase query for slugs in generateStaticParams failed, using fallback:",
      error
    );
  }

  // Fallback for offline build or unconfigured environments
  try {
    const fallback = (await getProducts()) || [];
    return fallback
      .filter((product) => Boolean(product?.slug))
      .map((product) => ({
        slug: String(product.slug),
      }));
  } catch {
    return [];
  }
}

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const resolved = await params;
  const slug = String(resolved?.slug || "").trim();
  if (!slug) {
    return { title: "Product Not Found | Plastipac USA" };
  }

  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | Plastipac USA",
    };
  }

  const title = product?.title || product?.name || "Stretch Film";

  return {
    title: `${title} | Plastipac USA`,
    description:
      product?.shortDescription ||
      product?.description ||
      "Industrial high-performance stretch film and packaging solutions.",
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const resolved = await params;
  const slug = String(resolved?.slug || "").trim();

  if (!slug) {
    notFound();
  }

  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const title = product?.title || product?.name || "Stretch Film";
  const features = Array.isArray(product?.features) ? product.features : [];
  const variants = Array.isArray(product?.variants) ? product.variants : [];

  const categorySlug =
    product?.categorySlug ||
    (product?.brand?.toLowerCase().includes("elite")
      ? "force-elite"
      : product?.brand?.toLowerCase().includes("genesis")
        ? product?.name?.toLowerCase().includes("hp")
          ? "genesis-high-performance"
          : "genesis-standard"
        : "force-standard");

  const categoryMeta =
    PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug) || null;

  const palletizing =
    product?.fullPalletRolls && product?.palletLayers && product?.rollsPerLayer
      ? {
          fullPalletRolls: product.fullPalletRolls,
          palletLayers: product.palletLayers,
          rollsPerLayer: product.rollsPerLayer,
          rollsPerBox: product.rollsPerBoxSpec || 4,
          boxesPerFullPallet:
            product.boxesPerFullPallet ||
            Math.round(
              (product.fullPalletRolls || 192) / (product.rollsPerBoxSpec || 4)
            ),
          packOutSummary:
            product.palletizingSummary ||
            `${product.fullPalletRolls} rolls / full pallet`,
          familyLabel: product.palletizingFamily || "Stretch Film",
        }
      : resolvePalletizingSpecs({
          widthInches: product?.widthInches ?? product?.width_inches,
          gauge: product?.gauge,
          lengthFeet: product?.length_feet,
          application: product?.application,
          slug: product?.slug,
          name: product?.title || product?.name,
        });

  const widthDisplay = Math.round(
    Number(product?.widthInches ?? product?.width_inches ?? 0)
  );
  const gaugeDisplay = product?.gauge ? `${product.gauge} GA` : undefined;
  const lengthDisplay = (() => {
    const n = Number(product?.length_feet);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return `${n.toLocaleString("en-US")} FT`;
  })();

  return (
    <div className="py-10 bg-slate-50/40 min-h-screen">
      <div className="max-w-[1800px] mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/" className="hover:text-sky-600 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link href="/products" className="hover:text-sky-600 transition-colors">
            Products
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sky-700 font-bold truncate">{title}</span>
        </nav>

        {/* Top Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Interactive Image Gallery & Technical Features */}
          <div className="lg:col-span-6 space-y-6">
            <ProductGallery
              images={product?.images || []}
              imageUrl={product?.imageUrl || ""}
              productName={title}
              application={product?.application === "machine" ? "machine" : "hand"}
              categoryLogoUrl={categoryMeta?.logoUrl}
              categoryName={categoryMeta?.name}
            />

            {/* Engineering Highlights */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                Performance Characteristics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {features.length > 0 ? (
                  features.map((feature, idx) => {
                    const label =
                      typeof feature === "string"
                        ? feature
                        : feature &&
                            typeof feature === "object" &&
                            ("text" in (feature as object) ||
                              "label" in (feature as object))
                          ? String(
                              (feature as { text?: string; label?: string }).text ||
                                (feature as { text?: string; label?: string }).label ||
                                ""
                            )
                          : typeof feature === "number" || typeof feature === "boolean"
                            ? String(feature)
                            : "";
                    if (!label) return null;
                    return (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-slate-600"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 flex-shrink-0 mt-0.5" />
                        <span>{label}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 col-span-full">
                    High-performance cast stretch film engineered for industrial
                    pallet containment.
                  </p>
                )}
              </div>
            </div>

            {/* Recommended Usage Callout */}
            {product?.recommendedUsage &&
              (typeof product.recommendedUsage === "string" ||
                typeof product.recommendedUsage === "number") && (
              <div className="p-5 rounded-2xl border border-sky-100 bg-sky-50/80 text-xs text-sky-900">
                <strong className="block text-sky-950 font-bold mb-1">
                  Recommended Industry Applications:
                </strong>
                {String(product.recommendedUsage)}
              </div>
            )}
          </div>

          {/* Right Column: Title, Live Main Price & Interactive Variant Selector */}
          <div className="lg:col-span-6">
            <ProductDetail product={product} />
          </div>
        </div>

        {/* Bottom Section: Full Engineering Dimension & Pack-Out Matrix */}
        <section className="pt-8 border-t border-slate-200 space-y-8">
          <PalletizingSpecsPanel
            specs={palletizing}
            widthLabel={widthDisplay ? `${widthDisplay}"` : undefined}
            gaugeLabel={gaugeDisplay}
            lengthLabel={lengthDisplay}
          />
          <SpecsTable variants={variants} />
        </section>
      </div>
    </div>
  );
}
