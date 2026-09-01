import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Factory, Globe2, ArrowRight, Truck, PhoneCall, Target } from "lucide-react";

export const metadata = {
  title: "About Plastipac USA | Industrial Stretch Packaging",
  description:
    "Learn about Plastipac USA, your premier partner for high-performance cast stretch films across South Texas and Northern Mexico.",
};

export default function AboutPage() {
  return (
    <div className="py-16 bg-white min-h-screen space-y-16 animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="default" className="uppercase text-xs tracking-wider font-bold">
            About Plastipac USA
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Engineering High-Performance Polymer Stretch Films
          </h1>
          <p className="text-base text-slate-600 leading-relaxed font-normal">
            Plastipac USA delivers advanced stretch wrap and pallet containment solutions tailored for logistics centers, distribution hubs, and industrial manufacturers across South Texas and Northern Mexico.
          </p>
        </div>

        {/* 3 Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl border border-slate-200/90 bg-white space-y-4 shadow-sm card-hover-effect">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Factory className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Multi-Layer Co-Extrusion</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Our advanced cast extrusion lines produce stretch films with exceptional holding force and high puncture resistance, minimizing film usage per pallet wrap.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-slate-200/90 bg-white space-y-4 shadow-sm card-hover-effect">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Cross-Border Logistics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Strategically positioned to service the Texas border corridor and northern industrial centers with rapid order fulfillment and dedicated freight dispatch.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-slate-200/90 bg-white space-y-4 shadow-sm card-hover-effect">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Sustainable Solutions</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Committed to responsible packaging with 100% recyclable virgin LLDPE formulations and high-performance PCR circular plastic options.
            </p>
          </div>
        </div>

        {/* Mission & Values Callout Box */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-sky-50/40 to-blue-50/30 p-8 sm:p-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="gradient" className="font-bold text-xs uppercase">
                Purpose & Commitment
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Driven by Quality, Reliability & Partnership
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed font-normal">
                Learn more about our dedicated corporate mission, vision for South Texas packaging excellence, and core operational values.
              </p>
            </div>
            <Button asChild variant="gradient" size="lg" className="self-start md:self-auto font-bold shadow-md shadow-sky-500/20">
              <Link href="/our-mission">
                <Target className="w-4 h-4 mr-2" />
                <span>Read Our Mission & Vision</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* CTA Banner with Official Phone Numbers */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Ready to Optimize Your Pallet Packaging?
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Contact our commercial sales desk directly for pallet volume quotes, sample rolls, and technical specifications.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <a
              href="tel:+19564003683"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 transition-colors font-bold text-sm"
            >
              <PhoneCall className="w-4 h-4 text-sky-600" />
              <span>(956) 400 36 83</span>
            </a>
            <a
              href="tel:+19564006563"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-800 hover:bg-sky-100 transition-colors font-bold text-sm"
            >
              <PhoneCall className="w-4 h-4 text-sky-600" />
              <span>(956) 400 65 63</span>
            </a>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="gradient" size="lg" className="shadow-lg shadow-sky-500/20 font-bold">
              <Link href="/#quote-section">
                <span>Request B2B Quote</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-slate-200 hover:bg-slate-50">
              <Link href="/products">
                <span>Explore Products</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
