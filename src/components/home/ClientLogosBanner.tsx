"use client";

import React from "react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

export interface ClientLogoItem {
  id: string;
  name: string;
  /** Optional URL path to an image file (PNG/SVG/WebP) for future replacement */
  logoUrl?: string;
  /** Optional inline SVG node for future replacement */
  logoSvg?: React.ReactNode;
  /** Optional external link */
  website?: string;
}

export const CLIENT_LOGOS: ClientLogoItem[] = [
  {
    id: "vertiv",
    name: "VERTIV",
    logoUrl:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/Vertiv_logo.svg",
  },
  {
    id: "regal-rexnord",
    name: "REGAL REXNORD",
    logoUrl:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/Regal_Rexnord_Corporation_logo.jpg",
  },
  {
    id: "corning",
    name: "CORNING",
    logoUrl:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/Corning_Incorporated_Logo.svg",
  },
  {
    id: "eaton",
    name: "EATON",
    logoUrl:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/Eaton_Corporation_Logo.svg",
  },
  {
    id: "horizon-global",
    name: "HORIZON GLOBAL",
    logoUrl:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/horizon-global-corporation-vector-logo.svg",
  },
];

/**
 * Dedicated slot / wrapper for individual client logos.
 * Makes it effortless to swap the placeholder typography for an <Image /> or SVG later.
 */
export function ClientLogoSlot({ client }: { client: ClientLogoItem }) {
  if (!client) return null;

  const content = (
    <div className="h-16 w-44 md:h-20 md:w-56 flex items-center justify-center p-2 transition-all duration-300">
      {client.logoSvg ? (
        <div className="h-8 max-w-[160px] flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
          {client.logoSvg}
        </div>
      ) : client.logoUrl ? (
        <div
          className={`relative flex h-full w-full items-center justify-center rounded-lg ${
            client.id === "regal-rexnord" ? "bg-white/70" : "bg-transparent"
          }`}
        >
          <Image
            src={client.logoUrl}
            alt={`${client.name} logo`}
            width={160}
            height={60}
            className={
              client.id === "horizon-global"
                ? "h-auto max-h-20 w-auto max-w-full md:max-h-28 object-contain scale-150 md:scale-175 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                : client.id === "regal-rexnord"
                ? "h-auto max-h-12 w-auto max-w-full md:max-h-16 object-contain mix-blend-multiply grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                : "h-auto max-h-12 w-auto max-w-full md:max-h-16 object-contain grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            }
          />
        </div>
      ) : (
        <span className="text-xl font-bold tracking-widest text-slate-400 uppercase hover:text-slate-600 transition-colors whitespace-nowrap select-none cursor-default">
          {client.name}
        </span>
      )}
    </div>
  );

  if (client.website) {
    return (
      <a
        href={client.website}
        target="_blank"
        rel="noopener noreferrer"
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg"
      >
        {content}
      </a>
    );
  }

  return content;
}

interface ClientLogosBannerProps {
  /** Optional customized section label */
  title?: string;
  /** Custom clients list override */
  clients?: ClientLogoItem[];
  /** Optional custom container className */
  className?: string;
}

export function ClientLogosBanner({
  title,
  clients = CLIENT_LOGOS,
  className = "",
}: ClientLogosBannerProps) {
  const { t } = useLanguage();

  // Duplicate list inline to guarantee seamless continuity across any screen size
  const safeClients = clients && clients.length > 0 ? clients : CLIENT_LOGOS;
  const repeatedClients = [...safeClients, ...safeClients];
  const resolvedTitle = title ?? t("home.clientLogosTitle");

  return (
    <section
      aria-label="Client trust banner"
      className={`relative w-full overflow-hidden bg-white py-10 sm:py-12 border-b border-slate-100 ${className}`}
    >
      {/* Top Header / Micro-label */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 select-none">
          {resolvedTitle}
        </p>
      </div>

      {/* Marquee Container */}
      <div className="relative w-full overflow-hidden group">
        {/* Subtle Edge Fade-out Gradients */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-36 md:w-48 bg-gradient-to-r from-white via-white/80 to-transparent z-10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-36 md:w-48 bg-gradient-to-l from-white via-white/80 to-transparent z-10"
          aria-hidden="true"
        />

        {/* Infinite Scrolling Track */}
        <div className="flex select-none">
          {/* Primary Track */}
          <div className="flex shrink-0 items-center justify-around gap-10 sm:gap-14 md:gap-20 lg:gap-24 pr-10 sm:pr-14 md:pr-20 lg:pr-24 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
            {repeatedClients.map((client, index) => (
              <ClientLogoSlot
                key={`primary-${client.id}-${index}`}
                client={client}
              />
            ))}
          </div>

          {/* Secondary Track (Seamless Loop Duplicate) */}
          <div
            aria-hidden="true"
            className="flex shrink-0 items-center justify-around gap-10 sm:gap-14 md:gap-20 lg:gap-24 pr-10 sm:pr-14 md:pr-20 lg:pr-24 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none"
          >
            {repeatedClients.map((client, index) => (
              <ClientLogoSlot
                key={`duplicate-${client.id}-${index}`}
                client={client}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

