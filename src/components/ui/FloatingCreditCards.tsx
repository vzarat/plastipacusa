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
      className={`absolute w-[280px] sm:w-[300px] aspect-[1.586/1] rounded-2xl ${gradient} shadow-2xl shadow-blue-500/30 border border-white/25 overflow-hidden ${className}`}
      style={style}
    >
      {/* Crisp glass highlight (no muddy overlay) */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent"
        aria-hidden
      />

      <div className="relative h-full flex flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <ChipIcon className="w-9 h-7 sm:w-10 sm:h-8" />
          {showDetails ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
              <Cpu className="w-3 h-3 text-cyan-100" />
              Net 30 Preferred
            </span>
          ) : (
            <span className="h-2 w-10 rounded-full bg-white/25" />
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-white">
            PLASTIPAC B2B CREDIT
          </p>
          {showDetails ? (
            <p className="font-mono text-sm sm:text-base tracking-[0.22em] text-white/90">
              •••• •••• •••• 0030
            </p>
          ) : (
            <div className="h-3 w-40 rounded bg-white/20" />
          )}
          <div className="flex items-end justify-between pt-1">
            <div>
              <p className="text-[8px] uppercase tracking-wider text-white/60">
                Corporate Line
              </p>
              <p className="text-xs font-semibold text-white">NET 30</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] uppercase tracking-wider text-white/60">
                USA
              </p>
              <p className="text-[10px] font-bold text-white/90">PLASTIPAC</p>
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
      className={`relative w-full h-[300px] sm:h-[340px] lg:h-[380px] ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-0 flex items-center justify-end"
        style={{ perspective: "1000px" }}
      >
        <motion.div
          className="relative w-[300px] h-[220px] sm:w-[320px] sm:h-[240px] mr-2 sm:mr-4"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ y: [0, -12, 0], rotate: [-12, -10, -12] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Back card */}
          <CreditCardFace
            gradient="bg-gradient-to-br from-blue-600 to-indigo-900"
            style={{
              transform:
                "rotateX(18deg) rotateY(-22deg) rotateZ(-8deg) translateZ(-40px) translateX(28px) translateY(36px)",
            }}
          />

          {/* Middle card */}
          <CreditCardFace
            gradient="bg-gradient-to-br from-blue-700 to-slate-900"
            style={{
              transform:
                "rotateX(14deg) rotateY(-18deg) rotateZ(-6deg) translateZ(-16px) translateX(14px) translateY(18px)",
            }}
          />

          {/* Top card */}
          <CreditCardFace
            gradient="bg-gradient-to-br from-cyan-400 to-blue-600"
            showDetails
            style={{
              transform:
                "rotateX(10deg) rotateY(-14deg) rotateZ(-4deg) translateZ(0)",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default FloatingCreditCards;
