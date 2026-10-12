import React from "react";
import dynamic from "next/dynamic";
import { getProducts } from "@/actions/products";
import { HeroBanner } from "@/components/home/HeroBanner";

/** Below-the-fold / heavy interactive sections — code-split off the LCP path. */
const ClientLogosBanner = dynamic(
  () =>
    import("@/components/home/ClientLogosBanner").then(
      (m) => m.ClientLogosBanner
    ),
  {
    loading: () => (
      <div
        className="w-full border-b border-slate-100 bg-white py-10 sm:py-12"
        aria-hidden
      />
    ),
  }
);

const USACoverageSection = dynamic(
  () =>
    import("@/components/home/USACoverageSection").then(
      (m) => m.USACoverageSection
    ),
  {
    loading: () => (
      <div
        className="min-h-[480px] border-t border-slate-200/80 bg-slate-50"
        aria-hidden
      />
    ),
  }
);

const CategoryShowcase = dynamic(
  () =>
    import("@/components/home/CategoryShowcase").then(
      (m) => m.CategoryShowcase
    ),
  {
    loading: () => (
      <div
        className="min-h-[280px] border-b border-slate-100 bg-slate-50/60 py-12"
        aria-hidden
      />
    ),
  }
);

const FeaturedProductSection = dynamic(
  () =>
    import("@/components/home/FeaturedProductSection").then(
      (m) => m.FeaturedProductSection
    ),
  {
    loading: () => (
      <div className="min-h-[420px] bg-white py-12" aria-hidden />
    ),
  }
);

const TrustBadges = dynamic(
  () =>
    import("@/components/home/TrustBadges").then((m) => m.TrustBadges),
  {
    loading: () => <div className="min-h-[160px]" aria-hidden />,
  }
);

const FreeSampleBanner = dynamic(
  () =>
    import("@/components/home/FreeSampleBanner").then(
      (m) => m.FreeSampleBanner
    ),
  {
    loading: () => <div className="min-h-[280px]" aria-hidden />,
  }
);

const InquiryForm = dynamic(
  () =>
    import("@/components/home/InquiryForm").then((m) => m.InquiryForm),
  {
    loading: () => <div className="min-h-[420px]" aria-hidden />,
  }
);

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="space-y-0">
      {/* 1. Hero Section — kept static for LCP discovery */}
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
