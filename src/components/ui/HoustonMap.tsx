"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";

const ROUTES = [
  { id: "i10", label: "I-10", d: "M 40 250 H 1000", dots: [0, 4.2, 8.4] },
  { id: "i45", label: "I-45", d: "M 640 24 V 516", dots: [1.1, 5.4] },
  {
    id: "i610",
    label: "I-610",
    d: "M 640 168 C 760 168 792 250 640 332 C 488 332 456 168 640 168",
    dots: [0.6, 3.8, 7],
  },
  {
    id: "bw8",
    label: "Beltway 8",
    d: "M 640 72 C 930 72 990 250 640 428 C 290 428 230 72 640 72",
    dots: [2, 6.5],
  },
] as const;

function RouteDot({ pathId, delay }: { pathId: string; delay: number }) {
  return (
    <circle r="3.5" fill="#7dd3fc" filter="url(#houston-dot-glow)">
      <animateMotion dur="12s" begin={`${-delay}s`} repeatCount="indefinite" rotate="auto">
        <mpath href={`#${pathId}`} />
      </animateMotion>
    </circle>
  );
}

export function HoustonMap() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden bg-[#070d1c]"
      aria-hidden
    >
      <div className="absolute inset-y-0 right-0 flex h-full w-full justify-end">
        <svg
          viewBox="0 0 1040 540"
          className="h-full w-[125%] max-w-none sm:w-[108%] lg:w-[72%]"
          preserveAspectRatio="xMaxYMid meet"
          role="img"
          aria-label="Houston highway routes"
        >
          <defs>
            <radialGradient id="houston-hub-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#0284c7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="houston-road" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1e3a5f" />
            </linearGradient>
            <filter id="houston-road-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="houston-dot-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="1040" height="540" fill="#070d1c" />

          {Array.from({ length: 14 }, (_, row) => (
            <line
              key={`h-${row}`}
              x1="0"
              x2="1040"
              y1={28 + row * 38}
              y2={28 + row * 38}
              stroke="#132033"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 22 }, (_, col) => (
            <line
              key={`v-${col}`}
              y1="0"
              y2="540"
              x1={20 + col * 48}
              x2={20 + col * 48}
              stroke="#132033"
              strokeWidth="1"
            />
          ))}

          <circle cx="640" cy="250" r="150" fill="url(#houston-hub-glow)" />

          {ROUTES.map((route) => (
            <path
              key={`${route.id}-base`}
              d={route.d}
              fill="none"
              stroke="#0f2744"
              strokeWidth={route.id === "bw8" ? 10 : route.id === "i610" ? 8 : 7}
              strokeLinecap="round"
            />
          ))}
          {ROUTES.map((route) => (
            <path
              key={route.id}
              id={route.id}
              d={route.d}
              fill="none"
              stroke="url(#houston-road)"
              strokeWidth={route.id === "bw8" || route.id === "i610" ? 2.25 : 2}
              strokeLinecap="round"
              filter="url(#houston-road-glow)"
            />
          ))}

          <text x="900" y="236" fill="#7dd3fc" fontSize="11" fontFamily="ui-sans-serif, system-ui, sans-serif">
            I-10
          </text>
          <text x="654" y="58" fill="#7dd3fc" fontSize="11" fontFamily="ui-sans-serif, system-ui, sans-serif">
            I-45
          </text>
          <text x="748" y="188" fill="#94a3b8" fontSize="11" fontFamily="ui-sans-serif, system-ui, sans-serif">
            I-610
          </text>
          <text x="860" y="108" fill="#94a3b8" fontSize="11" fontFamily="ui-sans-serif, system-ui, sans-serif">
            Beltway 8
          </text>

          <circle cx="640" cy="250" r="7" fill="#e0f2fe" />
          <circle cx="640" cy="250" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.85">
            {reduceMotion ? null : (
              <animate attributeName="r" values="12;22;12" dur="2.8s" repeatCount="indefinite" />
            )}
            {reduceMotion ? null : (
              <animate attributeName="opacity" values="0.85;0.15;0.85" dur="2.8s" repeatCount="indefinite" />
            )}
          </circle>

          {reduceMotion
            ? [
                [430, 250],
                [820, 250],
                [640, 120],
                [640, 390],
                [760, 250],
                [520, 250],
              ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#7dd3fc" opacity="0.9" />
              ))
            : ROUTES.flatMap((route) =>
                route.dots.map((delay) => (
                  <RouteDot key={`${route.id}-${delay}`} pathId={route.id} delay={delay} />
                ))
              )}
        </svg>
      </div>
    </div>
  );
}
