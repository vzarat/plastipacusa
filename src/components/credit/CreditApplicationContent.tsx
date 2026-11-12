"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, CreditCard, PhoneCall, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UserProfile } from "@/actions/auth";
import { useLanguage } from "@/context/LanguageContext";
import { B2BCreditFlow } from "@/components/credit/B2BCreditFlow";
import { CreditApplicationForm } from "@/components/credit/CreditApplicationForm";
import { PRIMARY_PHONE_DISPLAY, PRIMARY_PHONE_HREF } from "@/lib/company-contact";

const Beams = dynamic(
  () => import("@/components/ui/Beams").then((m) => m.Beams),
  { ssr: false }
);

const FloatingCreditCards = dynamic(
  () =>
    import("@/components/ui/FloatingCreditCards").then(
      (m) => m.FloatingCreditCards
    ),
  { ssr: false }
);

export function CreditApplicationContent({ profile }: { profile: UserProfile }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50/60">
      <section className="relative w-full overflow-hidden bg-[#000d23] px-4 py-8 text-white sm:px-6 sm:py-14 md:px-16 md:py-16">
        {/* Full-bleed Beams background */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-none">
          <div className="pointer-events-none absolute -inset-16 z-0 scale-125 overflow-hidden rounded-none opacity-100">
            <Beams
              backgroundColor="#000d23"
              beamColor="#00286a"
              beamHeight={40}
              beamNumber={60}
              beamWidth={2.8}
              lightColor="#ffffff"
              noiseIntensity={1.3}
              rotation={45}
              scale={0.35}
              speed={3.5}
            />
          </div>
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 lg:grid-cols-2 lg:gap-12">
          {/* Left — Copy & CTAs */}
          <div className="flex w-full min-w-0 flex-col items-start space-y-3.5 text-left sm:space-y-5">
            <Badge className="border border-white/20 bg-white/10 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-100 backdrop-blur-md sm:text-[11px] sm:tracking-[0.16em]">
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              {t("credit.badge")}
            </Badge>

            <h1 className="max-w-[18ch] text-[1.55rem] font-extrabold leading-[1.15] tracking-tight text-white sm:max-w-none sm:text-4xl lg:text-5xl">
              Apply for B2B Credit & Net 30 Terms
            </h1>

            <p className="max-w-xl text-[13px] leading-relaxed text-sky-100/90 sm:text-base">
              {t("credit.subtitle")}
            </p>

            <div className="flex w-full flex-col items-stretch gap-2.5 pt-1 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <a
                href="#credit-application-form"
                className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 transition-opacity hover:opacity-95"
              >
                Start Credit Application
                <ArrowRight className="h-4 w-4 shrink-0" />
              </a>
              <a
                href={PRIMARY_PHONE_HREF}
                className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/15"
              >
                <PhoneCall className="h-4 w-4 shrink-0 text-cyan-300" />
                Call {PRIMARY_PHONE_DISPLAY}
              </a>
            </div>

            <Link
              href="/products"
              className="text-xs font-semibold text-sky-300 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              Browse catalog while you apply →
            </Link>
          </div>

          {/* Right — Floating cards over beams (desktop/tablet) */}
          <div className="relative hidden min-h-[280px] items-center justify-end sm:flex lg:min-h-[340px]">
            <FloatingCreditCards className="ml-auto w-full max-w-md" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-5 px-3 pb-28 pt-6 sm:space-y-8 sm:px-6 sm:pb-14 sm:py-14 lg:px-8">
        <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-3 text-[12px] text-blue-900 sm:gap-3 sm:px-4 sm:text-xs">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
          <p className="min-w-0 leading-relaxed">
            Signed in as <span className="font-bold">{profile.email || profile.fullName}</span>
            {profile.companyName ? ` · ${profile.companyName}` : ""}. Your application is linked to
            this B2B account and status is tracked in{" "}
            <Link href="/dashboard/credit" className="font-bold underline underline-offset-2">
              Dashboard → Credit
            </Link>
            . {t("credit.notice")}
          </p>
        </div>

        <B2BCreditFlow />
        <div id="credit-application-form" className="scroll-mt-20">
          <CreditApplicationForm profile={profile} />
        </div>
      </section>
    </div>
  );
}
