import React from "react";
import { Truck, Award, Gauge, ShieldCheck } from "lucide-react";

export function TrustBadges() {
  const points = [
    {
      icon: Gauge,
      title: "Multi-Layer Cast Technology",
      description: "High-grade industrial co-extrusion produces consistent gauge thickness and maximum stretch recovery.",
    },
    {
      icon: ShieldCheck,
      title: "Puncture & Tear Resistance",
      description: "Formulated to withstand sharp pallet edges, irregular corners, and high-tension manual wrapping.",
    },
    {
      icon: Truck,
      title: "Cross-Border Dispatch",
      description: "Rapid regional truckload and pallet delivery across South Texas and Northern Mexico manufacturing hubs.",
    },
    {
      icon: Award,
      title: "Direct Mill Supply & Pricing",
      description: "Guaranteed inventory availability, full pallet discounts, and direct manufacturer support.",
    },
  ];

  return (
    <section className="py-16 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {points.map((pt) => {
            const Icon = pt.icon;
            return (
              <div
                key={pt.title}
                className="p-6 rounded-3xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-sky-200 hover:shadow-lg hover:shadow-sky-500/5 card-hover-effect transition-all"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{pt.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{pt.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
