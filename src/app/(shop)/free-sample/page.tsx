import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { FreeSampleRequestForm } from "@/components/home/FreeSampleRequestForm";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Request a Free Sample Roll | Plastipac USA",
  description:
    "Request a free GENESIS or FORCE stretch film sample roll for verified corporate accounts across the contiguous United States.",
};

export default function FreeSamplePage() {
  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-slate-800"
        style={{
          background:
            "linear-gradient(135deg, #0F172A 0%, #1E3A8A 48%, #2563EB 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 20%, rgba(255,255,255,0.16), transparent 42%), radial-gradient(circle at 85% 75%, rgba(56,189,248,0.22), transparent 36%)",
          }}
          aria-hidden
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 text-center space-y-5">
          <Badge className="bg-white/10 border-white/20 text-sky-100 uppercase tracking-[0.16em] text-[11px] font-bold">
            <FlaskConical className="w-3.5 h-3.5 mr-1.5" />
            Free Sample Program
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Request Your Free Sample Roll
          </h1>
          <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed max-w-2xl mx-auto">
            Experience the superior load retention, puncture resistance, and
            high-yield performance of GENESIS & FORCE stretch films in your
            facility before placing a bulk order.
          </p>
          <p className="text-[11px] leading-relaxed text-sky-200/75 max-w-2xl mx-auto">
            *Restrictions apply. Free sample rolls are available strictly for
            verified corporate accounts and high-volume packaging operations in the
            contiguous US. Subject to evaluation and availability.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-6">
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-xs text-blue-900">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-blue-700" />
          <p className="leading-relaxed">
            Samples are evaluated for corporate / high-volume operations only.
            Already know your SKU?{" "}
            <Link href="/products" className="font-bold underline underline-offset-2">
              Browse the catalog
            </Link>{" "}
            and open this form from any product card.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Loading sample request form…
            </div>
          }
        >
          <FreeSampleRequestForm />
        </Suspense>
      </section>
    </div>
  );
}
