import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Box, CheckCircle2, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroBanner() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 py-16 md:py-24 border-b border-slate-800">
      {/* Background Image Container */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/warehouse_storage_background.png"
          alt="Plastipac Warehouse Storage"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Dark High-Contrast Overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-brightness-75" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold shadow-sm backdrop-blur-xs">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Engineered for Maximum Pallet Load Containment</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
              Industrial Strength. <br />
              <span className="text-blue-400">
                Precision Stretch Film.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed font-normal">
              Plastipac USA manufactures high-performance cast stretch films engineered with multi-layer nano-technology. Cut film consumption by up to <strong className="text-white font-bold">40%</strong> while locking pallets down with zero freight damage.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Button
                asChild
                size="lg"
                variant="gradient"
                className="w-full sm:w-auto flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
              >
                <Link href="/products">
                  <span>Explore Product Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>

              <Link
                href="#inquiry-form"
                className="w-full sm:w-auto inline-flex items-center justify-center border border-white/30 bg-white/5 hover:bg-white/10 text-white font-medium h-12 px-6 rounded-xl backdrop-blur-sm transition-all shadow-sm cursor-pointer"
              >
                <span className="text-white font-medium">Request Wholesale Quote</span>
              </Link>
            </div>

            {/* Quick Specs Bulletpoints / Trust Badges */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/10 text-left">
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Up to 300%+</div>
                  <div className="text-[11px] text-slate-300">Pre-stretch yield</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Extreme Puncture Hold</div>
                  <div className="text-[11px] text-slate-300">Multi-layer cast strength</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Factory Direct</div>
                  <div className="text-[11px] text-slate-300">Truckload pricing</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Featured Product Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-white/20 bg-white/95 backdrop-blur-md p-7 shadow-2xl shadow-black/40">
              <div className="absolute -top-3 right-6">
                <Badge variant="gradient" className="shadow-md shadow-sky-500/20 font-bold px-3 py-1">
                  ★ Flagship Series
                </Badge>
              </div>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100">
                  <Box className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase text-sky-600 font-bold">
                    Force™ Cast Series
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Force™ Hand Stretch Film
                  </h3>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100 text-xs">
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Film Gauge</span>
                  <span className="font-bold text-slate-900 text-sm">50 Gauge</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Width</span>
                  <span className="font-bold text-slate-900 text-sm">18" Manual</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Application</span>
                  <span className="font-bold text-sky-700 text-sm">Manual Pallet Hold</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Starting at</span>
                  <span className="font-extrabold text-slate-900 text-sm">$20.71 / Box</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Ready to ship by case or pallet</span>
                <Button asChild variant="gradient" size="sm" className="gap-1.5 shadow-sm">
                  <Link href="/products/stretch-film-18-x-50-ga-x-1000ft">
                    <span>View Matrix</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const Hero = HeroBanner;
export default HeroBanner;
