"use client";

import React from "react";
import { useLanguage } from "@/context/LanguageContext";

interface GoogleSignInButtonProps {
  onClick: () => void;
  className?: string;
}

function GoogleGIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5 flex-shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.7 1.22 9.19 3.61l6.85-6.85C35.39 2.77 30.12 0 24 0 14.76 0 6.7 5.42 2.64 13.38l8 6.2C12.08 14.7 17.48 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.14-3.14-.4-4.62H24v8.75h12.76c-.56 2.96-2.24 5.47-4.76 7.15l7.68 5.96C43.36 37.52 46.5 31.52 46.5 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M24 47c6.48 0 11.92-2.14 15.89-5.84l-7.68-5.96c-2.12 1.43-4.86 2.29-8.21 2.29-6.26 0-11.54-4.2-13.42-9.87l-7.92 6.13C6.44 41.6 14.4 47 24 47z"
      />
      <path
        fill="#34A853"
        d="M10.58 31.92A13.97 13.97 0 0 1 9.5 24c0-1.6.28-3.14.76-4.62L2.64 13.38A23.96 23.96 0 0 0 0 24c0 3.84.92 7.47 2.56 10.72l8.02-6.8z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ onClick, className = "" }: GoogleSignInButtonProps) {
  const { t } = useLanguage();

  return (
    <div className={`group relative overflow-hidden rounded-xl p-[1.5px] transition-all duration-300 ${className}`}>
      <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[linear-gradient(120deg,#4285F4_0%,#EA4335_25%,#FBBC05_50%,#34A853_75%,#4285F4_100%)] bg-[length:220%_220%] group-hover:animate-[spin_6s_linear_infinite]" />
      <button
        type="button"
        onClick={onClick}
        className="relative z-10 flex w-full items-center justify-center gap-3 overflow-hidden rounded-[calc(0.75rem-1.5px)] border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:border-transparent hover:bg-slate-50 hover:text-slate-800 hover:shadow-md"
      >
        <GoogleGIcon />
        <span>{t("auth.googleContinue")}</span>
      </button>
    </div>
  );
}
