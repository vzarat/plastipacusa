"use client";

import React, { useEffect, useState } from "react";

const WHATSAPP_URL =
  "https://wa.me/19564003683?text=" +
  encodeURIComponent("Hi Plastipac USA — I’d like help with stretch film.");

function WhatsAppIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden>
      <path d="M19.11 17.33c-.28-.14-1.64-.81-1.9-.9-.25-.1-.44-.14-.62.14-.18.28-.71.9-.87 1.08-.16.18-.32.2-.6.07-.28-.14-1.17-.43-2.23-1.37-.82-.73-1.38-1.64-1.54-1.92-.16-.28-.02-.43.12-.57.12-.12.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.48-.07-.14-.62-1.5-.85-2.05-.22-.53-.45-.46-.62-.47h-.53c-.18 0-.48.07-.73.35-.25.28-.96.94-.96 2.3s.98 2.67 1.12 2.85c.14.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.57.65.21 1.25.18 1.72.11.52-.08 1.64-.67 1.87-1.32.23-.65.23-1.2.16-1.32-.07-.11-.25-.18-.53-.32z" />
      <path d="M16.04 3C9.42 3 4.05 8.37 4.05 14.99c0 2.12.56 4.18 1.62 6.01L4 29l8.2-1.64A12 12 0 0 0 16.04 27c6.62 0 11.99-5.37 11.99-11.99C28.03 8.37 22.66 3 16.04 3zm0 21.82c-1.93 0-3.82-.52-5.47-1.5l-.39-.23-4.86.97 1.03-4.74-.25-.41a9.84 9.84 0 0 1-1.5-5.25c0-5.44 4.43-9.86 9.86-9.86s9.86 4.43 9.86 9.86-4.42 9.86-9.86 9.86z" />
    </svg>
  );
}

export function WhatsAppFloat() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Plastipac USA on WhatsApp"
      className={`whatsapp-float group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-0 overflow-hidden rounded-full bg-[#1fad5a] text-white shadow-[0_10px_28px_-8px_rgba(15,118,66,0.55)] outline-none ring-1 ring-white/25 transition-[transform,box-shadow,opacity] duration-300 hover:bg-[#19a050] hover:shadow-[0_14px_32px_-8px_rgba(15,118,66,0.6)] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] sm:right-6 ${
        ready ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <span className="whatsapp-float-pulse pointer-events-none absolute inset-0 rounded-full" aria-hidden />
      <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14">
        <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
      <span className="relative z-10 max-w-0 overflow-hidden whitespace-nowrap pr-0 text-sm font-semibold tracking-tight opacity-0 transition-all duration-300 group-hover:max-w-[9.5rem] group-hover:pr-4 group-hover:opacity-100 group-focus-visible:max-w-[9.5rem] group-focus-visible:pr-4 group-focus-visible:opacity-100">
        Chat with us
      </span>
    </a>
  );
}
