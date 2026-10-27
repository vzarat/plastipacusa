"use client";

import { useEffect, useState } from "react";
import { EMAIL_RATE_LIMIT_COOLDOWN_MS, isEmailRateLimitError } from "@/lib/auth/email-rate-limit";

export function useEmailRateLimit(storageKey: string) {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const stored = Number(window.sessionStorage.getItem(storageKey) || 0);
    if (stored > Date.now()) setUntil(stored);
  }, [storageKey]);

  const remainingMs = until ? Math.max(0, until - now) : 0;
  const limited = remainingMs > 0;

  useEffect(() => {
    if (!limited) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [limited]);

  const lockFrom = (error: unknown) => {
    if (!isEmailRateLimitError(error)) return false;
    const next = Date.now() + EMAIL_RATE_LIMIT_COOLDOWN_MS;
    window.sessionStorage.setItem(storageKey, String(next));
    setUntil(next);
    setNow(Date.now());
    return true;
  };

  const minutesLeft = Math.max(1, Math.ceil(remainingMs / 60000));

  return { limited, minutesLeft, lockFrom };
}
