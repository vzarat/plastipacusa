"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  className?: string;
  showIcon?: boolean;
}

export function LanguageToggle({
  className = "",
  showIcon = true,
}: LanguageToggleProps) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selector / Selector de idioma"
      className={`inline-flex items-center p-0.5 rounded-xl border border-slate-200 bg-slate-100/90 text-xs font-bold shadow-2xs transition-all ${className}`}
    >
      {showIcon && (
        <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1 flex-shrink-0" />
      )}
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
          locale === "en"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-500 hover:text-slate-800"
        }`}
        aria-pressed={locale === "en"}
        title="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("es")}
        className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
          locale === "es"
            ? "bg-white text-slate-900 shadow-xs"
            : "text-slate-500 hover:text-slate-800"
        }`}
        aria-pressed={locale === "es"}
        title="Español"
      >
        ES
      </button>
    </div>
  );
}

