import React from "react";
import { Truck, Sparkles, PhoneCall } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800 text-white text-xs py-2.5 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sky-100">
          <span className="flex items-center gap-1.5 font-medium text-white">
            <Truck className="w-3.5 h-3.5 text-sky-200" />
            Direct Factory Full-Pallet & Truckload Orders
          </span>
          <span className="hidden md:inline text-sky-300">|</span>
          <span className="hidden md:flex items-center gap-1.5 text-sky-100">
            <Sparkles className="w-3.5 h-3.5 text-sky-200" />
            South Texas & Northern Mexico Delivery
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <a
            href="tel:+19564003683"
            className="flex items-center gap-1 text-white hover:text-sky-100 transition-colors font-semibold"
          >
            <PhoneCall className="w-3.5 h-3.5 text-sky-200" />
            (956) 400 36 83
          </a>
          <span className="text-sky-300">•</span>
          <a
            href="tel:+19564006563"
            className="text-white hover:text-sky-100 transition-colors font-semibold"
          >
            (956) 400 65 63
          </a>
        </div>
      </div>
    </div>
  );
}
