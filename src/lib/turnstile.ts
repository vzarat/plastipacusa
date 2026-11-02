/**
 * Cloudflare Turnstile verification (server).
 * Env: NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY
 */

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const TURNSTILE_MISSING_MESSAGE =
  "Please complete the bot check and try again.";

export const TURNSTILE_FAILED_MESSAGE =
  "Bot check failed. Refresh the page and try again.";

export function getTurnstileSiteKey(): string {
  return String(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "").trim();
}

export function getTurnstileSecretKey(): string {
  return String(process.env.TURNSTILE_SECRET_KEY || "").trim();
}

/** True when the server can verify tokens. */
export function isTurnstileEnforced(): boolean {
  return Boolean(getTurnstileSecretKey());
}

/** True when the widget should render in the browser. */
export function isTurnstileWidgetEnabled(): boolean {
  return Boolean(getTurnstileSiteKey());
}

type SiteverifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
};

/**
 * Validate a Turnstile response token with Cloudflare.
 * When TURNSTILE_SECRET_KEY is unset (local/dev), verification is skipped.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null
): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> {
  const secret = getTurnstileSecretKey();
  if (!secret) {
    return { ok: true, skipped: true };
  }

  const responseToken = String(token || "").trim();
  if (!responseToken) {
    return { ok: false, error: TURNSTILE_MISSING_MESSAGE };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", responseToken);
    const ip = String(remoteIp || "").trim();
    if (ip) body.set("remoteip", ip);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as SiteverifyResponse | null;
    if (!res.ok || !data?.success) {
      const codes = Array.isArray(data?.["error-codes"])
        ? data!["error-codes"]!.join(", ")
        : "";
      if (process.env.NODE_ENV !== "production" && codes) {
        console.warn("[turnstile] siteverify failed:", codes);
      }
      return { ok: false, error: TURNSTILE_FAILED_MESSAGE };
    }

    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[turnstile] siteverify exception:", message);
    return { ok: false, error: TURNSTILE_FAILED_MESSAGE };
  }
}

/** Convenience for server actions — returns an error string or null. */
export async function requireTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<string | null> {
  const result = await verifyTurnstileToken(String(token || ""), remoteIp);
  return result.ok ? null : result.error;
}
