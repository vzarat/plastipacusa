"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

const FAVICON =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FAVICON.png";

const MIN_VISIBLE_MS = 800;
const FADE_OUT_MS = 700;

export function AppSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const startedAt = Date.now();
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let unmountTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let exited = false;
    let cancelled = false;

    const beginExit = () => {
      if (cancelled || exited) return;
      exited = true;

      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);

      fadeTimer = setTimeout(() => {
        if (cancelled) return;
        setIsFading(true);

        unmountTimer = setTimeout(() => {
          if (!cancelled) setIsVisible(false);
        }, FADE_OUT_MS);
      }, wait);
    };

    if (document.readyState === "complete") {
      beginExit();
    } else {
      window.addEventListener("load", beginExit, { once: true });
      fallbackTimer = setTimeout(beginExit, MIN_VISIBLE_MS + 400);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", beginExit);
      if (fadeTimer) clearTimeout(fadeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden transition-opacity duration-700 pointer-events-none ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
      aria-busy={!isFading}
    >
      {/* Gradient orbs */}
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl animate-splash-orb-a"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl animate-splash-orb-b"
        aria-hidden="true"
      />

      {/* Central brand + loader */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="animate-splash-logo">
          <Image
            src={FAVICON}
            alt="Plastipac USA"
            width={112}
            height={112}
            priority
            className="h-24 w-24 sm:h-28 sm:w-28 object-contain drop-shadow-sm"
          />
        </div>

        <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 animate-splash-bar" />
        </div>
      </div>
    </div>
  );
}
