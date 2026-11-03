"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MessageCircle, PhoneCall } from "lucide-react";
import {
  PRIMARY_PHONE_DISPLAY,
  PRIMARY_PHONE_HREF,
  WHATSAPP_URL_BARE,
} from "@/lib/company-contact";

/**
 * WhatsApp-style bubble that pops in when scrolled into view.
 * Only mount this for sold-out products.
 */
export function OutOfStockCallout() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduceMotion) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <aside ref={ref} className="mt-3" aria-live="polite">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.88, x: -8 }}
        animate={
          visible
            ? { opacity: 1, y: 0, scale: 1, x: 0 }
            : { opacity: 0, y: 18, scale: 0.88, x: -8 }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 420, damping: 22, mass: 0.75 }
        }
        className="origin-bottom-left overflow-hidden rounded-2xl rounded-bl-md border border-blue-400/40 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 p-3.5 text-white shadow-lg shadow-blue-700/25 sm:p-4"
      >
        <p className="text-[13px] font-semibold leading-snug sm:text-sm">
          Need this size? It&apos;s out of stock — call us and we&apos;ll work it for you.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={PRIMARY_PHONE_HREF}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-blue-800 transition active:scale-[0.98] hover:bg-blue-50 sm:text-sm"
          >
            <PhoneCall className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">Call {PRIMARY_PHONE_DISPLAY}</span>
          </a>
          <a
            href={WHATSAPP_URL_BARE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/35 bg-white/10 px-3 py-2.5 text-xs font-bold text-white transition active:scale-[0.98] hover:bg-white/20 sm:text-sm"
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>WhatsApp</span>
          </a>
        </div>
      </motion.div>
    </aside>
  );
}
