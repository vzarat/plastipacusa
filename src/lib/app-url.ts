/** Stable production origin for public links and email assets. */
export const PRODUCTION_SITE_URL = "https://www.plastipacusa.com";

/**
 * Client- and server-safe public site URL (no next/headers).
 * Prefers NEXT_PUBLIC_APP_URL; never uses ephemeral VERCEL_URL (breaks email images).
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    const cleaned = explicit.replace(/\/$/, "");
    // Localhost / preview hosts still break remote email clients — force production assets.
    if (/localhost|127\.0\.0\.1|\.vercel\.app$/i.test(cleaned)) {
      return PRODUCTION_SITE_URL;
    }
    return cleaned;
  }
  return PRODUCTION_SITE_URL;
}
