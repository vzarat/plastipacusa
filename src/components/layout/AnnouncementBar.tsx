"use client";

import React from "react";
import { PhoneCall } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

function UsFlagIcon({ className = "h-4 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 19 10"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="19" height="10" fill="#B22234" />
      <rect y="0.77" width="19" height="0.77" fill="#FFFFFF" />
      <rect y="2.31" width="19" height="0.77" fill="#FFFFFF" />
      <rect y="3.85" width="19" height="0.77" fill="#FFFFFF" />
      <rect y="5.38" width="19" height="0.77" fill="#FFFFFF" />
      <rect y="6.92" width="19" height="0.77" fill="#FFFFFF" />
      <rect y="8.46" width="19" height="0.77" fill="#FFFFFF" />
      <rect width="7.6" height="5.38" fill="#3C3B6E" />
    </svg>
  );
}

export function AnnouncementBar() {
  const { t } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800 text-white text-xs py-2.5 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-sky-50 min-w-0">
          <UsFlagIcon className="h-3.5 w-[18px] shrink-0 rounded-[1px] shadow-sm" />
          <span className="font-semibold leading-snug text-center sm:text-left">
            {t("banner.usPride")}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          <a
            href="tel:+19564003683"
            className="flex items-center gap-1 text-white hover:text-sky-100 transition-colors font-semibold"
          >
            <PhoneCall className="w-3.5 h-3.5 text-sky-200" />
            (956) 400-3683
          </a>
        </div>
      </div>
    </div>
  );
}
