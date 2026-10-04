"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { startGuidedTour } from "@/lib/onboarding-tour";

/**
 * Lightweight post-hero CTA — CSS shine + Framer Motion fade only (no heavy JS).
 */
export function GuidedTourBanner() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative w-full overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800"
      aria-label="Guided buying tour"
    >
      {/* Soft ambient glow — pure CSS, no canvas */}
      <div
        className="pointer-events-none absolute -left-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-sky-400/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-300/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-sky-100" aria-hidden />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-bold leading-snug text-white sm:text-[15px]">
              Need help placing your first B2B order?
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => startGuidedTour()}
          className="group relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-blue-800 shadow-lg shadow-blue-950/25 transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-700 cursor-pointer sm:px-5 sm:text-[13px]"
        >
          {/* Shine sweep */}
          <span
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-sky-200/70 to-transparent opacity-0 transition-all duration-500 group-hover:left-[120%] group-hover:opacity-100"
            aria-hidden
          />
          <span className="relative whitespace-nowrap">Start Guided Tour</span>
          <ArrowRight className="relative h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.section>
  );
}
