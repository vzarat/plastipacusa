import React, { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { getProducts } from "@/actions/products";
import { HeroBanner } from "@/components/home/HeroBanner";

/** ISR: catalog refreshes about once a minute; hero streams immediately. */
export const revalidate = 60;

/** Below-the-fold / heavy interactive sections — code-split off the LCP path. */
const ClientLogosBanner = nextDynamic(
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

const USACoverageSection = nextDynamic(
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

const CategoryShowcase = nextDynamic(
  () =>
    import("@/components/home/CategoryShowcase").then(
      (m) => m.CategoryShowcase
    ),
  {
    loading: () => (
      <div
        className="hidden min-h-[280px] border-b border-slate-100 bg-slate-50/60 py-12 md:block"
        aria-hidden
      />
    ),
  }
);

const FeaturedProductSection = nextDynamic(
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

const TrustBadges = nextDynamic(
  () =>
    import("@/components/home/TrustBadges").then((m) => m.TrustBadges),
  {
    loading: () => <div className="hidden min-h-[160px] md:block" aria-hidden />,
  }
);

const FreeSampleBanner = nextDynamic(
  () =>
    import("@/components/home/FreeSampleBanner").then(
      (m) => m.FreeSampleBanner
    ),
  {
    loading: () => <div className="min-h-[280px]" aria-hidden />,
  }
);

const InquiryForm = nextDynamic(
  () =>
    import("@/components/home/InquiryForm").then((m) => m.InquiryForm),
  {
    loading: () => <div className="min-h-[420px]" aria-hidden />,
  }
);

async function FeaturedProductsBlock() {
  const products = await getProducts();
  return <FeaturedProductSection products={products} />;
}

export default function HomePage() {
  return (
    <div className="space-y-0">
      {/* 1. Hero Section — kept static for LCP discovery */}
      <HeroBanner />

      {/* 2. Client Logos Marquee Banner */}
      <ClientLogosBanner />

      {/* 3. Interactive Category Showcase Selector Grid */}
      <CategoryShowcase />

      {/* 4. Filterable Featured Product Catalog Grid */}
      <Suspense
        fallback={<div className="min-h-[420px] bg-white py-12" aria-hidden />}
      >
        <FeaturedProductsBlock />
      </Suspense>

      {/* 5. Nationwide USA Coverage Map */}
      <USACoverageSection />

      {/* 6. Trust Badges & Certifications */}
      <TrustBadges />

      {/* 7. Free Sample CTA */}
      <FreeSampleBanner />

      {/* 8. B2B Inquiry & Pallet Quote Form */}
      <InquiryForm />
    </div>
  );
}
