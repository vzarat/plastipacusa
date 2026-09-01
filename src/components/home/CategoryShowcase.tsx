import React from "react";
import Link from "next/link";
import { Hand, ShieldCheck, ScanLine, Truck, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CategoryShowcase() {
  const pillars = [
    {
      title: "High Puncture & Corner Hold",
      slug: "force-hand-stretch-film",
      description: "Multi-layer cast co-extruded film engineered for maximum puncture resistance on irregular pallet corners.",
      icon: ShieldCheck,
      badge: "Cast Co-Extrusion",
      widths: "12\", 15\", 18\"",
      gauge: "60 - 80 Ga",
      iconBg: "bg-sky-50 text-sky-600 border-sky-100",
    },
    {
      title: "Ergonomic & Quiet Release",
      slug: "force-hand-stretch-film",
      description: "Engineered differential slip release for effortless manual dispensing and whisper-quiet operation.",
      icon: Hand,
      badge: "Operator Fatigue Reduction",
      widths: "12\", 15\", 18\"",
      gauge: "60 - 80 Ga",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Optically Clear Barcode Scanning",
      slug: "force-hand-stretch-film",
      description: "Ultra-clear optical finish allows seamless handheld and automated barcode scanning directly through pallet wrap.",
      icon: ScanLine,
      badge: "High Clarity",
      widths: "12\", 15\", 18\"",
      gauge: "60 - 80 Ga",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    {
      title: "Direct Full-Pallet & Case Supply",
      slug: "force-hand-stretch-film",
      description: "Factory-direct pallet and box volume pricing with rapid cross-border dispatch from South Texas.",
      icon: Truck,
      badge: "Mill-Direct Logistics",
      widths: "12\", 15\", 18\"",
      gauge: "60 - 80 Ga",
      iconBg: "bg-slate-50 text-slate-700 border-slate-200",
    },
  ];

  return (
    <section className="py-20 bg-slate-50/60 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <Badge variant="default" className="text-xs uppercase tracking-widest font-bold">
            Industrial Performance Matrix
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Engineered Manual Stretch Film Performance
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Manufactured with cutting-edge cast extrusion technology to guarantee unyielding load retention, high tear resistance, and quiet release in warehouse operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.title}
                href={`/products/${cat.slug}`}
                className="group relative rounded-3xl border border-slate-200/80 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/10 card-hover-effect flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-3.5 rounded-2xl border ${cat.iconBg} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-50 transition-all">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-sky-600 uppercase font-bold">
                    {cat.badge}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1 group-hover:text-sky-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Widths: <strong className="text-slate-800">{cat.widths}</strong></span>
                  <span>Gauge: <strong className="text-slate-800">{cat.gauge}</strong></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
