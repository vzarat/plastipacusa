"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu, Mail, MessageCircle } from "lucide-react";

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M14 13.5h2.5l.5-3H14V8.75c0-.88.18-1.25 1.34-1.25H17V4.5h-2.6C11.9 4.5 11 6.24 11 8.48V10.5H8.5v3H11V20h3v-6.5z" />
    </svg>
  );
}

function LinkedinIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M6.94 6.5A1.94 1.94 0 1 1 5 4.56 1.94 1.94 0 0 1 6.94 6.5zM5.5 8.75h2.88V20H5.5zm5.12 0h2.76v1.54h.04c.38-.73 1.32-1.5 2.72-1.5 2.91 0 3.45 1.91 3.45 4.4V20h-2.88v-6.06c0-1.44-.03-3.3-2.01-3.3-2.01 0-2.32 1.57-2.32 3.19V20H10.62z" />
    </svg>
  );
}

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

function SocialIconBar({ interactive = false }: { interactive?: boolean }) {
  const linkClass = interactive
    ? "hover:text-cyan-300 transition-colors p-1"
    : "p-1 pointer-events-none";

  return (
    <div className="flex items-center gap-3 text-white/90">
      <a
        href="https://facebook.com"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="Facebook"
        tabIndex={interactive ? undefined : -1}
      >
        <FacebookIcon className="w-4 h-4" />
      </a>
      <a
        href="https://linkedin.com"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="LinkedIn"
        tabIndex={interactive ? undefined : -1}
      >
        <LinkedinIcon className="w-4 h-4" />
      </a>
      <a
        href="mailto:info@plastipacusa.com"
        className={linkClass}
        aria-label="Email"
        tabIndex={interactive ? undefined : -1}
      >
        <Mail className="w-4 h-4" />
      </a>
      <a
        href="https://wa.me/19564003683"
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        aria-label="WhatsApp"
        tabIndex={interactive ? undefined : -1}
      >
        <MessageCircle className="w-4 h-4" />
      </a>
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
          <div className="flex items-end justify-between pt-1 gap-3">
            <div>
              <p className="text-[8px] uppercase tracking-wider text-white/60">
                Corporate Line
              </p>
              <p className="text-xs font-semibold text-white">NET 30</p>
            </div>
            <SocialIconBar interactive={showDetails} />
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
