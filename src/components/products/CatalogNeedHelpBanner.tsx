"use client";

import React from "react";
import { MessageCircle, PhoneCall } from "lucide-react";
import {
  PRIMARY_PHONE_DISPLAY,
  PRIMARY_PHONE_HREF,
  WHATSAPP_PHONE_DISPLAY,
  WHATSAPP_URL_BARE,
} from "@/lib/company-contact";

interface CatalogNeedHelpBannerProps {
  compact?: boolean;
}

export function CatalogNeedHelpBanner({ compact = false }: CatalogNeedHelpBannerProps) {
  return (
    <aside
      className={`overflow-hidden rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 text-white shadow-lg shadow-blue-700/25 ${
        compact ? "p-4 sm:p-5" : "p-4 sm:p-6 md:p-7"
      }`}
      aria-label="Need help finding a product"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="min-w-0 space-y-1.5 text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-100 sm:text-[11px]">
            Custom / Out of Stock
          </p>
          <h3 className="text-[1.05rem] font-extrabold leading-snug tracking-tight text-white sm:text-lg">
            Can&apos;t find what you&apos;re looking for?
          </h3>
          <p className="text-[13px] leading-relaxed text-blue-50/90 sm:text-sm md:max-w-xl">
            <span className="md:hidden">
              Missing or sold out? Call us today and we&apos;ll place your order.
            </span>
            <span className="hidden md:inline">
              If the spec you need is missing or marked sold out, call us today —
              we&apos;ll build your order and confirm availability.
            </span>
          </p>
        </div>

        <div className="grid w-full shrink-0 grid-cols-1 gap-2.5 sm:grid-cols-2 md:w-auto md:min-w-[17.5rem] md:grid-cols-1">
          <a
            href={PRIMARY_PHONE_HREF}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-800 transition active:scale-[0.98] hover:bg-blue-50"
          >
            <PhoneCall className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">Call {PRIMARY_PHONE_DISPLAY}</span>
          </a>
          <a
            href={WHATSAPP_URL_BARE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-3 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-white/20"
          >
            <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">
              <span className="sm:hidden">WhatsApp us</span>
              <span className="hidden sm:inline">WhatsApp {WHATSAPP_PHONE_DISPLAY}</span>
            </span>
          </a>
        </div>
      </div>
    </aside>
  );
}
