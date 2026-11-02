import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Factory, ArrowRight, Truck, PhoneCall, Target, MapPin } from "lucide-react";
const COMPANY_STREET = "5801 George McVay Dr";
const COMPANY_CITY_LINE = "McAllen, TX 78503";
const COMPANY_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=5801+George+McVay+Dr,+McAllen,+TX+78503";

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    href: "https://www.facebook.com/plastipacusa",
    color: "#1877F2",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
        <path d="M14 13.5h2.5l.5-3H14V8.75c0-.88.18-1.25 1.34-1.25H17V4.5h-2.6C11.9 4.5 11 6.24 11 8.48V10.5H8.5v3H11V20h3v-6.5z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/plastipacusa",
    color: "#E4405F",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
        <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/19564003683",
    color: "#25D366",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/plastipacusa",
    color: "#0A66C2",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden>
        <path d="M6.94 6.5A1.94 1.94 0 1 1 5 4.56 1.94 1.94 0 0 1 6.94 6.5zM5.5 8.75h2.88V20H5.5zm5.12 0h2.76v1.54h.04c.38-.73 1.32-1.5 2.72-1.5 2.91 0 3.45 1.91 3.45 4.4V20h-2.88v-6.06c0-1.44-.03-3.3-2.01-3.3-2.01 0-2.32 1.57-2.32 3.19V20H10.62z" />
      </svg>
    ),
  },
] as const;

const USACoverageMap = dynamic(
  () =>
    import("@/components/common/USACoverageMap").then((m) => m.USACoverageMap),
  {
    loading: () => (
      <div className="min-h-[360px] rounded-3xl border border-slate-200 bg-slate-50" aria-hidden />
    ),
  }
);

export const metadata = {
  title: "About Plastipac USA | Industrial Stretch Packaging",
  description:
    "Learn about Plastipac USA, your premier partner for high-performance cast stretch films across South Texas and the United States.",
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
            Plastipac USA delivers advanced stretch wrap and pallet containment solutions tailored for logistics centers, distribution hubs, and industrial manufacturers across South Texas and the United States.
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
            <h3 className="text-xl font-bold text-slate-900">USA Logistics Coverage</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Strategically positioned in South Texas to service industrial centers nationwide with rapid order fulfillment and dedicated freight dispatch.
            </p>
          </div>

          <div className="p-8 rounded-3xl border border-slate-200/90 bg-white space-y-4 shadow-sm card-hover-effect">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Uncompromising Load Stability</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Formulated with high-strength resins to deliver exceptional cling, maximum corner retention, and quiet unwind during intensive warehouse wrapping.
            </p>
          </div>
        </div>

        {/* Interactive USA Coverage Map */}
        <USACoverageMap />

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

        {/* Location */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3 max-w-xl">
              <Badge variant="default" className="uppercase text-xs tracking-wider font-bold">
                Our Location
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Visit Plastipac USA
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Our warehouse and commercial office are in McAllen, South Texas, ready to support industrial stretch film orders across the Rio Grande Valley and nationwide.
              </p>
              <a
                href={COMPANY_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-left transition-colors hover:bg-sky-50"
              >
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <span className="text-sm">
                  <span className="block font-bold text-slate-900">{COMPANY_STREET}</span>
                  <span className="block text-slate-600">{COMPANY_CITY_LINE}</span>
                </span>
              </a>
            </div>
            <Button asChild variant="outline" size="lg" className="self-start border-slate-200 hover:bg-slate-50">
              <a href={COMPANY_MAPS_URL} target="_blank" rel="noopener noreferrer">
                <MapPin className="mr-2 h-4 w-4" />
                <span>Open in Maps</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Social */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/40 p-8 sm:p-12 text-center shadow-sm">
          <Badge variant="default" className="uppercase text-xs tracking-wider font-bold">
            Community
          </Badge>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900">
            Follow us on social media
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 leading-relaxed">
            Stay connected with Plastipac USA for product updates, logistics news, and industrial packaging tips.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="group flex w-[6.5rem] flex-col items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm transition-transform group-hover:scale-105"
                  style={{ backgroundColor: social.color }}
                >
                  {social.icon}
                </span>
                <span className="text-xs font-bold text-slate-700">{social.name}</span>
              </a>
            ))}
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
                <span>Request Quote</span>
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
