/**
 * Warp freight settings. API keys stay in server env vars.
 * Origin, markup, and the free-delivery minimum are constants here.
 */

/** Warehouse zip and city. The street lives in origin.ts and is not shown at checkout. */
export const WARP_ORIGIN_ZIP: string = "78507";

export const WARP_ORIGIN_CITY: string = "McAllen";

export const WARP_ORIGIN_STATE: string = "TX";

/** Percent added on top of a Warp quote. 0 means the quoted amount is unchanged. */
export const SHIPPING_MARKUP_PERCENT = 0;

/** Rolls required before RGV local delivery is free. */
export const FREE_LOCAL_DELIVERY_MIN_ROLLS = 64;

export {
  HAND_FREIGHT_DIMENSIONS_IN,
  handFreightDimensions,
  handFreightTier,
  type HandFreightTier,
} from "@/lib/shipping/hand-freight";

const WARP_BASE_URLS = {
  staging: "https://stg.wearewarp.com/api/v1",
  production: "https://gw.wearewarp.com/api/v1",
} as const;

export type WarpEnv = keyof typeof WARP_BASE_URLS;

const STAGING_QUOTES_NOTE = "Staging quotes";

let loggedStagingQuotes = false;

function assertServerOnly(): void {
  if (typeof window !== "undefined") {
    throw new Error("Warp shipping config is server-only.");
  }
}

export function normalizeWarpEnv(value: string | undefined): WarpEnv | null {
  const env = value?.trim().replace(/^['"]|['"]$/g, "").trim().toLowerCase();
  if (env === "staging" || env === "production") return env;
  return null;
}

export type WarpSettingStatus = "OK" | "MISSING" | "INVALID";

function settingStatus(value: string | undefined, valid: (trimmed: string) => boolean): WarpSettingStatus {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "MISSING";
  return valid(trimmed) ? "OK" : "INVALID";
}

export function inspectWarpSettings(): {
  VERCEL_ENV: "production" | "preview" | "development" | "unset";
  keyRead: "WARP_API_KEY_STAGING" | "WARP_API_KEY_PRODUCTION" | null;
  settings: {
    WARP_ENV: WarpSettingStatus;
    WARP_API_KEY_STAGING: WarpSettingStatus;
    WARP_API_KEY_PRODUCTION: WarpSettingStatus;
    WARP_ORIGIN_ZIP: WarpSettingStatus;
    WARP_ORIGIN_CITY: WarpSettingStatus;
    WARP_ORIGIN_STATE: WarpSettingStatus;
  };
  warnings: string[];
} {
  const warpEnv = normalizeWarpEnv(process.env.WARP_ENV);
  const envStatus: WarpSettingStatus = !process.env.WARP_ENV?.trim()
    ? "MISSING"
    : warpEnv
      ? "OK"
      : "INVALID";
  const keyRead =
    warpEnv === "production"
      ? "WARP_API_KEY_PRODUCTION"
      : warpEnv === "staging"
        ? "WARP_API_KEY_STAGING"
        : null;
  const vercel = process.env.VERCEL_ENV;
  const vercelEnv =
    vercel === "production" || vercel === "preview" || vercel === "development" ? vercel : "unset";
  const warnings: string[] = [];
  if (warpEnv === "production" && vercelEnv === "preview") {
    warnings.push(
      'WARP_ENV is "production" while VERCEL_ENV is "preview". Preview deployments only receive variables scoped to Preview.'
    );
  }
  return {
    VERCEL_ENV: vercelEnv,
    keyRead,
    settings: {
      WARP_ENV: envStatus,
      WARP_API_KEY_STAGING: settingStatus(process.env.WARP_API_KEY_STAGING, () => true),
      WARP_API_KEY_PRODUCTION: settingStatus(process.env.WARP_API_KEY_PRODUCTION, () => true),
      WARP_ORIGIN_ZIP: settingStatus(WARP_ORIGIN_ZIP, (value) => /^\d{5}$/.test(value)),
      WARP_ORIGIN_CITY: settingStatus(WARP_ORIGIN_CITY, (value) => value.length > 0),
      WARP_ORIGIN_STATE: settingStatus(WARP_ORIGIN_STATE, (value) => /^[A-Za-z]{2}$/.test(value)),
    },
    warnings,
  };
}

/** Names only. No values. */
export function warpConfigProblemNames(): string[] {
  const report = inspectWarpSettings();
  const names: string[] = [];
  if (report.settings.WARP_ENV !== "OK") names.push("WARP_ENV");
  if (report.keyRead && report.settings[report.keyRead] !== "OK") names.push(report.keyRead);
  if (report.settings.WARP_ORIGIN_ZIP !== "OK") names.push("WARP_ORIGIN_ZIP");
  if (report.settings.WARP_ORIGIN_CITY !== "OK") names.push("WARP_ORIGIN_CITY");
  if (report.settings.WARP_ORIGIN_STATE !== "OK") names.push("WARP_ORIGIN_STATE");
  return names;
}

export function readWarpEnv(): WarpEnv {
  const env = normalizeWarpEnv(process.env.WARP_ENV);
  if (!env) {
    throw new Error(`Missing or invalid: ${warpConfigProblemNames().join(", ") || "WARP_ENV"}`);
  }
  return env;
}

/**
 * Resolves the Warp base URL and API key for WARP_ENV.
 * Throws if the environment is invalid or its key is missing.
 * Never logs the key.
 */
export function getWarpConfig(): { env: WarpEnv; baseUrl: string; apiKey: string } {
  assertServerOnly();
  const problems = warpConfigProblemNames();
  if (problems.length > 0) {
    throw new Error(`Missing or invalid: ${problems.join(", ")}`);
  }
  const env = readWarpEnv();
  if (env === "staging" && !loggedStagingQuotes) {
    loggedStagingQuotes = true;
    console.info(STAGING_QUOTES_NOTE);
  }

  const keyName = env === "staging" ? "WARP_API_KEY_STAGING" : "WARP_API_KEY_PRODUCTION";
  const apiKey = process.env[keyName]?.trim() ?? "";
  if (!apiKey) {
    throw new Error(`Missing or invalid: ${keyName}`);
  }

  return {
    env,
    baseUrl: WARP_BASE_URLS[env],
    apiKey,
  };
}

/** Source override. The quote route also honors the SHOW_SHIPPING_DEBUG environment variable. */
export const SHOW_SHIPPING_DEBUG = false;

function envFlagOn(value: string | undefined): boolean {
  const flag = String(value || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

/** Full diagnostics when SHOW_SHIPPING_DEBUG is on, in local development, or on the Warp staging key. */
export function shippingDebugVisible(): boolean {
  if (envFlagOn(process.env.SHOW_SHIPPING_DEBUG)) return true;
  if (SHOW_SHIPPING_DEBUG) return true;
  if (process.env.NODE_ENV === "development") return true;
  if (normalizeWarpEnv(process.env.WARP_ENV) === "staging") return true;
  return false;
}

export function stagingQuotesNote(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (normalizeWarpEnv(process.env.WARP_ENV) !== "staging") return null;
  return STAGING_QUOTES_NOTE;
}
