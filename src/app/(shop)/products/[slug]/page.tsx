import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/actions/products";
import { ProductGallery } from "@/components/products/ProductGallery";
import { VariantSelector } from "@/components/products/VariantSelector";
import { SpecsTable } from "@/components/products/SpecsTable";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";

import { FALLBACK_PRODUCTS } from "@/data/mock-products";
import { PRODUCT_CATEGORIES } from "@/data/categories";

export const dynamicParams = true;

export async function generateStaticParams() {
  return FALLBACK_PRODUCTS.map((product) => ({
    slug: product.slug,
  }));
}

interface ProductDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const categorySlug =
    product.categorySlug ||
    (product.brand?.toLowerCase().includes("elite")
      ? "force-elite"
      : product.brand?.toLowerCase().includes("genesis")
      ? product.name?.toLowerCase().includes("hp")
        ? "genesis-high-performance"
        : "genesis-standard"
      : "force-standard");

  const categoryMeta =
    PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug) || null;

  return (
    <div className="py-10 bg-slate-50/40 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
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
          <span className="text-sky-700 font-bold truncate">
            {product.name}
          </span>
        </nav>

        {/* Top Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Interactive Image Gallery & Technical Features */}
          <div className="lg:col-span-6 space-y-6">
            <ProductGallery
              images={product.images}
              imageUrl={product.imageUrl}
              productName={product.name}
              application={product.application}
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
                {product.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Usage Callout */}
            {product.recommendedUsage && (
              <div className="p-5 rounded-2xl border border-sky-100 bg-sky-50/80 text-xs text-sky-900">
                <strong className="block text-sky-950 font-bold mb-1">
                  Recommended Industry Applications:
                </strong>
                {product.recommendedUsage}
              </div>
            )}
          </div>

          {/* Right Column: Title & Interactive Variant Selector */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono uppercase text-sky-600 font-bold tracking-wider">
                  {product.brand} • {product.filmType || "Cast Co-Extruded Multi-Layer"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {product.name}
              </h1>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Interactive Dimension / Gauge / Packaging Selector */}
            <VariantSelector product={product} />

            {/* Direct Tech Support CTA */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <PhoneCall className="w-4 h-4 text-sky-600" />
                <span>Need custom specs? Call <strong className="text-slate-900">(956) 400 36 83</strong></span>
              </div>
              <a
                href="tel:+19564003683"
                className="font-bold text-sky-600 hover:text-sky-700"
              >
                Call Specialist →
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section: Full Engineering Dimension & Pack-Out Matrix */}
        <section className="pt-8 border-t border-slate-200">
          <SpecsTable variants={product.variants} />
        </section>
      </div>
    </div>
  );
}
