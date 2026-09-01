import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Eye,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  Users,
  Award,
  PhoneCall,
  Mail,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Our Mission & Vision | Plastipac USA",
  description:
    "Discover the mission, vision, and core values that drive Plastipac USA to be the premier stretch film manufacturer in South Texas and Northern Mexico.",
};

export default function OurMissionPage() {
  const coreValues = [
    {
      icon: Lightbulb,
      title: "Innovation",
      description:
        "Continuously investing in advanced polymer formulations and nano-layer extrusion technology to maximize load holding force and reduce material consumption.",
      accent: "bg-sky-50 text-sky-600 border-sky-100",
    },
    {
      icon: ShieldCheck,
      title: "Integrity",
      description:
        "Upholding uncompromising honesty, transparent pricing, and consistent roll dimensions on every shipment we deliver.",
      accent: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      icon: Users,
      title: "Customer Focus",
      description:
        "Building long-term industrial partnerships through prompt customer service, tailored packaging consultations, and reliable stock availability.",
      accent: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    {
      icon: Award,
      title: "Operational Excellence",
      description:
        "Delivering punctuality, rigorous quality control, and zero-defect packaging products across South Texas and Northern Mexico.",
      accent: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
  ];

  return (
    <div className="py-16 bg-white min-h-screen space-y-20 animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <Badge variant="default" className="uppercase text-xs tracking-wider font-bold">
            Corporate Purpose & Philosophy
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Driven by Excellence. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700">
              Committed to Your Success.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            At Plastipac USA, we engineer high-performance stretch packaging solutions designed to safeguard your cargo, elevate supply chain efficiency, and power industrial growth.
          </p>
        </div>

        {/* Mission & Vision Dual Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Mission Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-sky-50/30 to-blue-50/20 p-8 sm:p-10 space-y-6 shadow-sm flex flex-col justify-between card-hover-effect">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-sky-500/20">
                <Target className="w-7 h-7" />
              </div>
              <span className="text-xs font-mono uppercase text-sky-700 font-bold tracking-wider">
                Our Purpose
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Our Mission
              </h2>
              <blockquote className="text-base sm:text-lg text-slate-700 leading-relaxed italic border-l-4 border-sky-500 pl-4">
                "Our mission is to provide innovative, quality solutions that meet our clients' needs, driving their success and well-being. We are committed to maintaining high standards of excellence and sustainable packaging solutions."
              </blockquote>
            </div>

            <div className="pt-6 border-t border-slate-200/80 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>Tailored film thickness optimization for reduced packaging waste</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>High-tensile formulas guaranteeing maximum freight stability</span>
              </div>
            </div>
          </div>

          {/* Vision Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-blue-50/30 to-slate-50/40 p-8 sm:p-10 space-y-6 shadow-sm flex flex-col justify-between card-hover-effect">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Eye className="w-7 h-7" />
              </div>
              <span className="text-xs font-mono uppercase text-blue-700 font-bold tracking-wider">
                Our Future
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Our Vision
              </h2>
              <blockquote className="text-base sm:text-lg text-slate-700 leading-relaxed italic border-l-4 border-blue-600 pl-4">
                "To be recognized as the premier stretch film manufacturer and packaging partner in South Texas and Northern Mexico, delivering reliability, punctuality, and maximum load protection."
              </blockquote>
            </div>

            <div className="pt-6 border-t border-slate-200/80 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Unrivaled cross-border distribution and fast dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Factory-direct volume pricing with immediate commercial response</span>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values Section */}
        <div className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="default" className="uppercase text-xs font-bold">
              Foundational Principles
            </Badge>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Our Core Values
            </h2>
            <p className="text-sm text-slate-500">
              The fundamental beliefs that guide our operations, customer relationships, and manufacturing standards every day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((val) => {
              const Icon = val.icon;
              return (
                <div
                  key={val.title}
                  className="rounded-3xl border border-slate-200/90 bg-white p-7 space-y-4 shadow-sm hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10 card-hover-effect transition-all"
                >
                  <div className={`w-12 h-12 rounded-2xl border ${val.accent} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{val.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{val.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Reach & Cross-Border Commitment */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 text-white p-8 sm:p-12 space-y-6 shadow-xl">
          <div className="max-w-3xl space-y-4">
            <Badge variant="gradient" className="font-bold uppercase text-xs">
              South Texas & Northern Mexico Hub
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Strategic Proximity for Fast Freight Dispatch
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Headquartered with rapid access to key trade corridors in the Rio Grande Valley, Laredo, San Antonio, and major manufacturing clusters in Northern Mexico, Plastipac USA eliminates long lead times and ensures continuous inventory supply for our clients.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-slate-800 text-center sm:text-left">
            <div>
              <span className="text-3xl font-extrabold text-sky-400">100%</span>
              <span className="block text-xs text-slate-400 mt-1">Inspection Rate</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-blue-400">24/48h</span>
              <span className="block text-xs text-slate-400 mt-1">Regional Dispatch</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-emerald-400">300%+</span>
              <span className="block text-xs text-slate-400 mt-1">Pre-Stretch Yield</span>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-amber-400">Direct</span>
              <span className="block text-xs text-slate-400 mt-1">Factory Pricing</span>
            </div>
          </div>
        </div>

        {/* CTA Contact & Quote Section */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center space-y-6 shadow-sm">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Partner With Plastipac USA Today
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Connect directly with our sales engineering team to evaluate your pallet packaging requirements and receive contract wholesale pricing.
            </p>
          </div>

          {/* Official Phone & Email Contacts */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
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

            <a
              href="mailto:contact@plastipacusa.com"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-semibold text-sm"
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>contact@plastipacusa.com</span>
            </a>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="gradient" size="lg" className="shadow-lg shadow-sky-500/20 font-bold">
              <Link href="/#quote-section">
                <span>Request Wholesale Pallet Quote</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-slate-200 hover:bg-slate-50">
              <Link href="/products">
                <span>Browse Product Catalog</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
