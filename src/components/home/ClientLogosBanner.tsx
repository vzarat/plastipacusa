import React from "react";
import Image from "next/image";

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
  { id: "corning", name: "CORNING" },
  { id: "vertiv", name: "VERTIV" },
  { id: "eaton", name: "EATON" },
  { id: "regal-rexnord", name: "REGAL REXNORD" },
  { id: "horizon-global", name: "HORIZON GLOBAL" },
];

/**
 * Dedicated slot / wrapper for individual client logos.
 * Makes it effortless to swap the placeholder typography for an <Image /> or SVG later.
 */
export function ClientLogoSlot({ client }: { client: ClientLogoItem }) {
  if (!client) return null;

  const content = (
    <div className="flex items-center justify-center h-12 px-6 sm:px-8 py-2 transition-all duration-300">
      {client.logoSvg ? (
        <div className="h-8 max-w-[160px] flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
          {client.logoSvg}
        </div>
      ) : client.logoUrl ? (
        <div className="relative h-8 w-36">
          <Image
            src={client.logoUrl}
            alt={`${client.name} logo`}
            fill
            className="object-contain filter grayscale opacity-60 hover:opacity-100 transition-opacity"
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
  title = "Trusted by Industrial Leaders",
  clients = CLIENT_LOGOS,
  className = "",
}: ClientLogosBannerProps) {
  // Duplicate list inline to guarantee seamless continuity across any screen size
  const safeClients = clients && clients.length > 0 ? clients : CLIENT_LOGOS;
  const repeatedClients = [...safeClients, ...safeClients];

  return (
    <section
      aria-label="Client trust banner"
      className={`relative w-full overflow-hidden bg-white py-10 sm:py-12 border-b border-slate-100 ${className}`}
    >
      {/* Top Header / Micro-label */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400 select-none">
          {title}
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

