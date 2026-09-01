import React from "react";
import Link from "next/link";
import { Hand, Cpu, ShieldAlert, Leaf, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CategoryShowcase() {
  const categories = [
    {
      title: "Hand Stretch Film",
      slug: "force-hand-stretch-film",
      app: "hand",
      description: "Ergonomic manual pallet wraps with high cling, quiet unwind, and extreme tear resistance.",
      icon: Hand,
      badge: "Force™ Cast Series",
      widths: "12\", 15\", 18\"",
      gauge: "60 - 80 Ga",
      iconBg: "bg-sky-50 text-sky-600 border-sky-100",
    },
    {
      title: "Machine High-Yield Film",
      slug: "genesis-high-performance-machine-film",
      app: "machine",
      description: "Cast nano-structure film with up to 300% pre-stretch for high-volume automated turntables.",
      icon: Cpu,
      badge: "Genesis™ Nano Series",
      widths: "20\", 30\"",
      gauge: "55 - 80 Ga",
      iconBg: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Puncture-Resistant Machine Wrap",
      slug: "stealth-puncture-machine-film",
      app: "machine",
      description: "Heavy-duty hybrid film for irregular loads, protruding nails, bricks, and jagged freight.",
      icon: ShieldAlert,
      badge: "Stealth™ Extreme",
      widths: "20\"",
      gauge: "90 - 115 Ga",
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
    },
    {
      title: "Sustainable Recycled PCR Film",
      slug: "eco-max-pcr-hand-film",
      app: "hand",
      description: "Eco-friendly cast wrap with 30% certified post-consumer recycled plastic to meet corporate ESG targets.",
      icon: Leaf,
      badge: "Eco-Max™ Circular",
      widths: "18\"",
      gauge: "70 - 80 Ga",
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
  ];

  return (
    <section className="py-20 bg-slate-50/60 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <Badge variant="default" className="text-xs uppercase tracking-widest font-bold">
            Industrial Product Matrix
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Specialized Stretch Film for Every Pallet Load
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Whether wrapping 10 pallets a day by hand or 500 pallets an hour on automated orbital wrappers, Plastipac has the engineered resin formulation for your facility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => {
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
