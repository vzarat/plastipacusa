"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";

function ChipIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div
      className={`relative rounded-md bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 shadow-inner border border-amber-300/60 ${className}`}
      aria-hidden
    >
      <div className="absolute inset-[3px] rounded-[3px] border border-amber-700/30 grid grid-cols-3 gap-px p-0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <span key={i} className="rounded-[1px] bg-amber-800/25" />
        ))}
      </div>
    </div>
  );
}

function CreditCardFace({
  gradient,
  className = "",
  showDetails = false,
  style,
}: {
  gradient: string;
  className?: string;
  showDetails?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`absolute w-[280px] sm:w-[300px] aspect-[1.586/1] rounded-2xl ${gradient} shadow-2xl shadow-blue-500/20 border border-white/20 overflow-hidden ${className}`}
      style={style}
    >
      {/* Glassmorphism sheen */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/25 via-white/5 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />

      <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <ChipIcon className="w-9 h-7 sm:w-10 sm:h-8" />
          {showDetails ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white/95">
              <Cpu className="w-3 h-3 text-cyan-200" />
              Net 30 Preferred
            </span>
          ) : (
            <span className="h-2 w-10 rounded-full bg-white/20" />
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
            PLASTIPAC B2B CREDIT
          </p>
          {showDetails ? (
            <p className="font-mono text-sm sm:text-base tracking-[0.22em] text-white/80">
              •••• •••• •••• 0030
            </p>
          ) : (
            <div className="h-3 w-40 rounded bg-white/15" />
          )}
          <div className="flex items-end justify-between pt-1">
            <div>
              <p className="text-[8px] uppercase tracking-wider text-white/50">
                Corporate Line
              </p>
              <p className="text-xs font-semibold text-white/90">NET 30</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-wider text-white/50">
                USA
              </p>
              <p className="text-[10px] font-bold text-white/80">PLASTIPAC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FloatingCreditCards({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative w-full h-[280px] sm:h-[320px] lg:h-[360px] overflow-hidden ${className}`}
      aria-hidden
    >
      {/* Perspective stage — cards emerge from bottom-right */}
      <div
        className="absolute inset-0 flex items-end justify-end pr-2 sm:pr-4"
        style={{ perspective: "1000px" }}
      >
        <motion.div
          className="relative w-[300px] h-[220px] sm:w-[320px] sm:h-[240px] translate-x-6 sm:translate-x-10 translate-y-10 sm:translate-y-14"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ y: [0, -12, 0], rotate: [-12, -10, -12] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Back card */}
          <CreditCardFace
            gradient="bg-gradient-to-br from-blue-600 to-indigo-900"
            style={{
              transform: "rotateX(18deg) rotateY(-22deg) rotateZ(-8deg) translateZ(-40px) translateX(28px) translateY(36px)",
            }}
            className="opacity-80"
          />

          {/* Middle card */}
          <CreditCardFace
            gradient="bg-gradient-to-br from-blue-700 to-slate-900"
            style={{
              transform: "rotateX(14deg) rotateY(-18deg) rotateZ(-6deg) translateZ(-16px) translateX(14px) translateY(18px)",
            }}
            className="opacity-90"
          />

          {/* Top card */}
          <CreditCardFace
            gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
            showDetails
            style={{
              transform: "rotateX(10deg) rotateY(-14deg) rotateZ(-4deg) translateZ(0)",
            }}
            className="bg-white/10 backdrop-blur-md"
          />
        </motion.div>
      </div>

      {/* Soft edge fade so cards blend into banner */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/80 to-transparent"
        aria-hidden
      />
    </div>
  );
}

export default FloatingCreditCards;
