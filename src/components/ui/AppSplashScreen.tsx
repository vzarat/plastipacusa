"use client";

import React, { useEffect, useState } from "react";

const LOADING_ICON =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CARGA_ICON.svg";

export default function AppSplashScreen() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!mounted || !visible) return null;

  try {
    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl animate-pulse"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-cyan-400/25 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOADING_ICON}
            alt="Loading"
            className="h-24 w-24 mb-4 object-contain animate-bounce"
          />

          <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}
