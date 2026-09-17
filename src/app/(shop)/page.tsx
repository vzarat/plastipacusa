import React from "react";
import Link from "next/link";
import { getProducts } from "@/actions/products";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ClientLogosBanner } from "@/components/home/ClientLogosBanner";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { FeaturedProductSection } from "@/components/home/FeaturedProductSection";
import { TrustBadges } from "@/components/home/TrustBadges";
import { InquiryForm } from "@/components/home/InquiryForm";
import { USACoverageSection } from "@/components/home/USACoverageSection";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <HeroBanner />

      {/* 2. Client Logos Marquee Banner */}
      <ClientLogosBanner />

      {/* 3. Interactive Category Showcase Selector Grid */}
      <CategoryShowcase />

      {/* 4. Filterable Featured Product Catalog Grid */}
      <FeaturedProductSection products={products} />

      {/* 5. Trust Badges & Certifications */}
      <TrustBadges />

      {/* 6. B2B Inquiry & Pallet Quote Form */}
      <InquiryForm />

      {/* 7. Nationwide USA Coverage Map — above Footer */}
      <USACoverageSection />
    </div>
  );
}
