import React from "react";
import Link from "next/link";
import { getProducts } from "@/actions/products";
import { HeroBanner } from "@/components/home/HeroBanner";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { TrustBadges } from "@/components/home/TrustBadges";
import { InquiryForm } from "@/components/home/InquiryForm";
import { ProductCard } from "@/components/products/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="space-y-0 bg-white">
      {/* 1. Hero Section */}
      <HeroBanner />

      {/* 2. Category Showcase */}
      <CategoryShowcase />

      {/* 3. Featured Product Catalog Grid */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <Badge variant="default" className="mb-2 uppercase text-xs tracking-wider font-bold">
                Direct Mill Catalog
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Featured Industrial Film Series
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Precision cast polyethylene pallet wrap formulated for high load security and maximum roll yield.
              </p>
            </div>
            <Button asChild variant="outline" className="self-start md:self-auto gap-2 rounded-xl border-slate-200 hover:bg-slate-50">
              <Link href="/products">
                <span>View Full Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={idx < 4}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Trust Badges & Certifications */}
      <TrustBadges />

      {/* 5. B2B Inquiry & Pallet Quote Form */}
      <InquiryForm />
    </div>
  );
}
