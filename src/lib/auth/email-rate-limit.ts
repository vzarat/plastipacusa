export const EMAIL_RATE_LIMIT_MESSAGE =
  "Too many email requests sent. For security reasons, please wait 15–30 minutes before trying again, or try logging in if you already have an account.";

/** Client throttle after Supabase returns an email send limit. */
export const EMAIL_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;

export function isEmailRateLimitError(error: unknown): boolean {
  if (typeof error === "string") {
    return error.toLowerCase().includes("email rate limit exceeded");
  }
  if (!error || typeof error !== "object") return false;

  const detail = error as { message?: unknown; status?: unknown };
  if (Number(detail.status) === 429) return true;

  const message = String(detail.message || "").trim().toLowerCase();
  return message === "email rate limit exceeded" || message.includes("email rate limit exceeded");
}
