import React from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";

interface FreeSampleBannerProps {
  className?: string;
  productSlug?: string;
  productName?: string;
}

function buildFreeSampleHref(productSlug?: string, productName?: string) {
  const params = new URLSearchParams();
  if (productSlug) params.set("product", productSlug);
  if (productName) params.set("name", productName);
  const qs = params.toString();
  return qs ? `/free-sample?${qs}` : "/free-sample";
}

export function FreeSampleBanner({
  className = "",
  productSlug,
  productName,
}: FreeSampleBannerProps) {
  const href = buildFreeSampleHref(productSlug, productName);

  return (
    <section
      id="free-sample"
      className={`relative overflow-hidden border-y border-slate-800 ${className}`}
      style={{
        background:
          "linear-gradient(135deg, #0F172A 0%, #1E3A8A 48%, #2563EB 100%)",
      }}
      aria-labelledby="free-sample-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 80%, rgba(56,189,248,0.25), transparent 35%)",
        }}
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-100">
            <FlaskConical className="h-3.5 w-3.5" />
            Free Sample Program
          </div>

          <h2
            id="free-sample-heading"
            className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight"
          >
            Test the Quality — Request Your Free Sample Roll
          </h2>

          <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed max-w-2xl mx-auto">
            Experience the superior load retention, puncture resistance, and
            high-yield performance of GENESIS & FORCE stretch films in your
            facility before placing a bulk order.
          </p>

          <div className="pt-2">
            <Link
              href={href}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-[#0F172A] shadow-lg shadow-blue-950/30 hover:bg-sky-50 transition-colors"
            >
              Request Free Sample
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="text-[10px] sm:text-[11px] leading-relaxed text-sky-200/70 max-w-2xl mx-auto pt-1">
            *Restrictions apply. Free sample rolls are available strictly for
            verified corporate accounts and high-volume packaging operations in
            the contiguous US. Subject to evaluation and availability.
          </p>
        </div>
      </div>
    </section>
  );
}
