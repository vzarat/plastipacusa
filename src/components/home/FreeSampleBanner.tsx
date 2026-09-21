"use client";

import React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

const Beams = dynamic(
  () => import("@/components/ui/Beams").then((m) => m.Beams),
  { ssr: false }
);

const STRETCH_IMAGE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/STRETCH.png";

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
      className={`relative overflow-visible my-12 ${className}`}
      aria-labelledby="free-sample-heading"
    >
      <div className="relative w-full overflow-visible bg-slate-900 rounded-3xl p-8 md:p-12">
        {/* Background Beams Canvas */}
        <div className="absolute inset-0 z-0 overflow-hidden rounded-3xl opacity-80 pointer-events-none">
          <Beams
            backgroundColor="#0f172a"
            beamColor="#2563eb"
            beamHeight={15}
            beamNumber={12}
            beamWidth={2}
            lightColor="#ffffff"
            noiseIntensity={0.65}
            rotation={0}
            scale={0.2}
            speed={2}
          />
        </div>

        {/* Foreground Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10 pointer-events-auto max-w-7xl mx-auto">
          {/* Left — Text & CTA */}
          <div className="text-left flex flex-col items-start">
            <span className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-2">
              INDUSTRIAL GRADE QUALITY
            </span>

            <h2
              id="free-sample-heading"
              className="text-3xl font-extrabold text-white mb-4 tracking-tight leading-tight"
            >
              Test the Quality — Request Your Free Sample Roll
            </h2>

            <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed mb-4 max-w-xl">
              Experience the superior load retention, puncture resistance, and
              high-yield performance of GENESIS & FORCE stretch films in your
              facility before placing a bulk order.
            </p>

            <p className="text-[10px] sm:text-[11px] leading-relaxed text-sky-200/70 max-w-xl mb-6">
              *Restrictions apply. Free sample rolls are available strictly for
              verified corporate accounts and high-volume packaging operations in
              the contiguous US. Subject to evaluation and availability.
            </p>

            <Link
              href={href}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-[#0F172A] shadow-lg shadow-blue-950/30 hover:bg-sky-50 transition-colors pointer-events-auto"
            >
              Request Free Sample
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Right — Product image floats past bottom edge */}
          <div className="relative flex items-center justify-center min-h-[360px] w-full">
            <Image
              src={STRETCH_IMAGE}
              alt="Plastipac USA stretch film roll"
              width={480}
              height={480}
              className="object-contain max-h-[360px] w-auto drop-shadow-[0_25px_35px_rgba(0,0,0,0.6)] z-10 translate-y-6 md:translate-y-10 scale-105"
              priority={false}
            />

            <div className="absolute top-0 right-2 z-20 bg-white/95 text-slate-900 px-3.5 py-2 rounded-xl shadow-2xl border border-slate-100 flex items-center gap-2.5 pointer-events-none">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900">
                  100% Quality Guaranteed
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  ISO Certified High-Yield Film
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
