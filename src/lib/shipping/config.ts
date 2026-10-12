/**
 * Warp freight settings. API keys stay in server env vars.
 * Origin, markup, and the free-delivery minimum are constants here.
 */

/** TODO: replace with the warehouse origin ZIP. */
export const WARP_ORIGIN_ZIP = "00000";

/** TODO: replace with the warehouse origin city. */
export const WARP_ORIGIN_CITY = "TODO";

/** TODO: replace with the warehouse origin state. */
export const WARP_ORIGIN_STATE = "TX";

/** Percent added on top of a Warp quote. 0 means the quoted amount is unchanged. */
export const SHIPPING_MARKUP_PERCENT = 0;

/** Rolls required before RGV local delivery is free. */
export const FREE_LOCAL_DELIVERY_MIN_ROLLS = 64;

/**
 * TODO: pallet length, width, and height in inches are not stored on products.
 * Leave these null. Do not put a guessed pallet size here.
 */
export const TODO_PALLET_LENGTH_IN: number | null = null;
export const TODO_PALLET_WIDTH_IN: number | null = null;
export const TODO_PALLET_HEIGHT_IN: number | null = null;

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

export function readWarpEnv(): WarpEnv {
  const env = process.env.WARP_ENV;
  if (env !== "staging" && env !== "production") {
    throw new Error('WARP_ENV must be "staging" or "production".');
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
  const env = readWarpEnv();
  if (env === "staging" && !loggedStagingQuotes) {
    loggedStagingQuotes = true;
    console.info(STAGING_QUOTES_NOTE);
  }

  const keyName = env === "staging" ? "WARP_API_KEY_STAGING" : "WARP_API_KEY_PRODUCTION";
  const apiKey = process.env[keyName]?.trim() ?? "";
  if (!apiKey) {
    throw new Error(`${keyName} is required when WARP_ENV is "${env}".`);
  }

  return {
    env,
    baseUrl: WARP_BASE_URLS[env],
    apiKey,
  };
}

/** Dev-only label. Hidden whenever Node is running in production. */
export function stagingQuotesNote(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.WARP_ENV !== "staging") return null;
  return STAGING_QUOTES_NOTE;
}
