"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { DotField } from "@/components/ui/DotField";

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
      aria-labelledby="free-sample-heading"
    >
      <div
        className="relative w-full overflow-hidden bg-slate-900 p-8 md:p-12"
        style={{
          background:
            "linear-gradient(135deg, #0F172A 0%, #1E3A8A 48%, #2563EB 100%)",
        }}
      >
        {/* Background Interactive Canvas */}
        <div className="absolute inset-0 z-0 opacity-60 pointer-events-none">
          <DotField
            bulgeStrength={67}
            dotRadius={1.5}
            dotSpacing={14}
            glowColor="#1E3A8A"
            glowRadius={160}
            gradientFrom="#ffffff"
            gradientTo="#3B82F6"
            sparkle={false}
            waveAmplitude={0}
          />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 pointer-events-auto max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-sky-100 pointer-events-auto">
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

            <div className="pt-2 pointer-events-auto">
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
      </div>
    </section>
  );
}
