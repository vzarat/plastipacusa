import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Box, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-100">
      {/* Background radial sky glow accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-sky-100/60 via-blue-50/30 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-sky-200/20 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0284c708_1px,transparent_1px),linear-gradient(to_bottom,#0284c708_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold shadow-sm">
              <Zap className="w-3.5 h-3.5 text-sky-600" />
              <span>Engineered for Maximum Pallet Load Containment</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
              Industrial Strength. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700">
                Precision Stretch Film.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-normal">
              Plastipac USA manufactures high-performance cast stretch films engineered with multi-layer nano-technology. Cut film consumption by up to <strong className="text-slate-900 font-bold">40%</strong> while locking pallets down with zero freight damage.
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

              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <Link href="#quote-section">
                  <span>Request Wholesale Quote</span>
                </Link>
              </Button>
            </div>

            {/* Quick Specs Bulletpoints */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 text-left">
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Up to 300%+</div>
                  <div className="text-[11px] text-slate-500">Pre-stretch yield</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Extreme Puncture Hold</div>
                  <div className="text-[11px] text-slate-500">Multi-layer cast strength</div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-full bg-emerald-50 text-emerald-600 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Factory Direct</div>
                  <div className="text-[11px] text-slate-500">Truckload pricing</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Featured Product Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl shadow-slate-200/50">
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
                  <span className="font-bold text-slate-900 text-sm">60 - 80 Gauge</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Width</span>
                  <span className="font-bold text-slate-900 text-sm">12", 15", 18" Manual</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Application</span>
                  <span className="font-bold text-sky-700 text-sm">Manual Pallet Hold</span>
                </div>
                <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Starting at</span>
                  <span className="font-extrabold text-slate-900 text-sm">$13.90 / Roll</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Ready to ship by case or pallet</span>
                <Button asChild variant="gradient" size="sm" className="gap-1.5 shadow-sm">
                  <Link href="/products/force-hand-stretch-film">
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
