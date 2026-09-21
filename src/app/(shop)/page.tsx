import React from "react";
import { getProducts } from "@/actions/products";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ClientLogosBanner } from "@/components/home/ClientLogosBanner";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { FeaturedProductSection } from "@/components/home/FeaturedProductSection";
import { TrustBadges } from "@/components/home/TrustBadges";
import { InquiryForm } from "@/components/home/InquiryForm";
import { USACoverageSection } from "@/components/home/USACoverageSection";
import { FreeSampleBanner } from "@/components/home/FreeSampleBanner";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="space-y-0">
      {/* 1. Hero Section */}
      <HeroBanner />

      {/* 2. Client Logos Marquee Banner */}
      <ClientLogosBanner />

      {/* 3. Nationwide USA Coverage Map — between logos and product lines */}
      <USACoverageSection />

      {/* 4. Interactive Category Showcase Selector Grid */}
      <CategoryShowcase />

      {/* 5. Filterable Featured Product Catalog Grid */}
      <FeaturedProductSection products={products} />

      {/* 6. Trust Badges & Certifications */}
      <TrustBadges />

      {/* 7. Free Sample CTA */}
      <FreeSampleBanner />

      {/* 8. B2B Inquiry & Pallet Quote Form */}
      <InquiryForm />
    </div>
  );
}
