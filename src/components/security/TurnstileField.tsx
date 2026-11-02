"use client";

import React, { useEffect, useRef } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

const SITE_KEY = String(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""
).trim();

export function isBrowserTurnstileEnabled(): boolean {
  return SITE_KEY.length > 0;
}

export type TurnstileFieldHandle = {
  reset: () => void;
  getToken: () => string | undefined;
};

interface TurnstileFieldProps {
  onToken: (token: string | null) => void;
  className?: string;
  /** compact | normal | invisible — default normal for forms */
  size?: "normal" | "compact" | "flexible" | "invisible";
  theme?: "light" | "dark" | "auto";
  /** Optional imperative handle for reset after one-time token use. */
  widgetRef?: React.MutableRefObject<TurnstileFieldHandle | null>;
}

/**
 * Cloudflare Turnstile widget. Renders nothing when the site key is unset
 * (local/dev without keys). Parent must still pass token to the server;
 * server skips verify when TURNSTILE_SECRET_KEY is unset.
 */
export function TurnstileField({
  onToken,
  className,
  size = "flexible",
  theme = "light",
  widgetRef,
}: TurnstileFieldProps) {
  const instanceRef = useRef<TurnstileInstance | null>(null);

  useEffect(() => {
    if (!widgetRef) return;
    widgetRef.current = {
      reset: () => {
        instanceRef.current?.reset();
        onToken(null);
      },
      getToken: () => instanceRef.current?.getResponse() || undefined,
    };
    return () => {
      widgetRef.current = null;
    };
  }, [widgetRef, onToken]);

  if (!SITE_KEY) return null;

  return (
    <div className={className || "flex justify-center py-1"}>
      <Turnstile
        siteKey={SITE_KEY}
        options={{
          theme,
          size,
          appearance: "always",
        }}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
        ref={instanceRef}
      />
    </div>
  );
}
