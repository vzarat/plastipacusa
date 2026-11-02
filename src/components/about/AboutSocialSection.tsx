"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";

const GradientASCII = dynamic(() => import("@/components/ui/GradientASCII"), {
  ssr: false,
});

const SOCIAL_LINKS = [
  {
    name: "Facebook",
    handle: "Plastipacusa",
    href: "https://www.facebook.com/profile.php?id=61557962543741",
    color: "#1877F2",
    soft: "rgba(24, 119, 242, 0.18)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M14 13.5h2.5l.5-3H14V8.75c0-.88.18-1.25 1.34-1.25H17V4.5h-2.6C11.9 4.5 11 6.24 11 8.48V10.5H8.5v3H11V20h3v-6.5z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    handle: "@plastipacusallc",
    href: "https://www.instagram.com/plastipacusallc/",
    color: "#E4405F",
    soft: "rgba(228, 64, 95, 0.18)",
    gradient: "linear-gradient(135deg, #F58529 0%, #DD2A7B 50%, #8134AF 100%)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    handle: "(956) 400-3683",
    href: "https://wa.me/19564003683",
    color: "#25D366",
    soft: "rgba(37, 211, 102, 0.18)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    handle: "Plastipac USA",
    href: "https://www.linkedin.com/company/plastipacusa",
    color: "#0A66C2",
    soft: "rgba(10, 102, 194, 0.18)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7" aria-hidden>
        <path d="M6.94 6.5A1.94 1.94 0 1 1 5 4.56 1.94 1.94 0 0 1 6.94 6.5zM5.5 8.75h2.88V20H5.5zm5.12 0h2.76v1.54h.04c.38-.73 1.32-1.5 2.72-1.5 2.91 0 3.45 1.91 3.45 4.4V20h-2.88v-6.06c0-1.44-.03-3.3-2.01-3.3-2.01 0-2.32 1.57-2.32 3.19V20H10.62z" />
      </svg>
    ),
  },
] as const;

export function AboutSocialSection() {
  return (
    <section className="relative min-h-[34rem] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-sm sm:min-h-[30rem]">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <GradientASCII
          colors={["#082f49", "#0ea5e9", "#e0f2fe", "#38bdf8"]}
          shape="horizon"
          characters=" ·=+*xX0S#@"
          cellSize={16}
          density={0.72}
          glyphOpacity={0.55}
          gradientOpacity={0.85}
          glow={0.28}
          flicker={0.12}
          softness={0.62}
          scale={1.15}
          flow={0.45}
          speed={0.55}
          grain={0.05}
          mouseInteraction={false}
          clickEffect="none"
          intro
          className="h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/55 to-slate-950/35" />
        <div className="absolute inset-0 bg-slate-950/25" />
      </div>

      <div className="relative z-10 grid gap-10 p-8 sm:p-10 lg:grid-cols-[1.1fr_1.4fr] lg:items-center lg:gap-12 lg:p-12">
        <div className="space-y-4 text-left">
          <Badge className="border-sky-400/30 bg-sky-500/15 text-sky-100 text-xs font-bold uppercase tracking-wider">
            Community
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Follow us on social media
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-200 sm:text-base">
            Product launches, freight updates, and packaging tips from our South
            Texas team — straight to your feed.
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/90">
            Plastipac USA · RGV &amp; Nationwide
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow Plastipac USA on ${social.name}`}
              className="group relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-slate-950/45 p-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-slate-950/60 sm:min-h-[8.25rem] sm:p-5"
            >
              <span
                className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-80 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ backgroundColor: social.soft }}
                aria-hidden
              />
              <span
                className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14"
                style={{
                  background:
                    "gradient" in social && social.gradient
                      ? social.gradient
                      : social.color,
                  boxShadow: `0 12px 28px -10px ${social.color}`,
                }}
              >
                {social.icon}
              </span>
              <span className="relative z-10 mt-4 space-y-0.5 text-left">
                <span className="block text-sm font-bold text-white sm:text-base">
                  {social.name}
                </span>
                <span className="block text-[11px] font-medium text-slate-300 sm:text-xs">
                  {social.handle}
                </span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
