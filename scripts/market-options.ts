/**
 * Read-only check of POST /ltl/market-options on the documented host.
 * Run: npx tsx --env-file=.env.local scripts/market-options.ts
 * Does not print API keys or header values, and does not book a shipment.
 */
import { getWarpConfig, WARP_ORIGIN_ZIP } from "../src/lib/shipping/config";
import { LTL_MARKET_OPTIONS_URL, fetchLtlMarketOptions } from "../src/lib/shipping/market-options";

const DESTINATION_ZIP = "77002";
const TIMEOUT_MS = 50_000;

function nextPickupDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const config = getWarpConfig();
  console.log(LTL_MARKET_OPTIONS_URL);
  const result = await fetchLtlMarketOptions({
    apiKey: config.apiKey,
    originZip: WARP_ORIGIN_ZIP,
    destinationZip: DESTINATION_ZIP,
    pickupDate: nextPickupDate(),
    pallets: 1,
    weightLbsPerPallet: 500,
    lengthIn: 48,
    widthIn: 48,
    heightIn: 48,
    timeoutMs: TIMEOUT_MS,
  });
  console.log(`HTTP ${result.httpStatus}`);
  console.log(`options=${result.options.length}`);
  for (const option of result.options) {
    console.log(
      [
        option.carrierName,
        option.serviceLevel,
        option.price.toFixed(2),
        option.transitDays == null ? "transit=unknown" : `transit=${option.transitDays}`,
        `expires=${option.expiresAt}`,
      ].join(" ")
    );
  }
}

main().catch((error: unknown) => {
  const aborted = error instanceof Error && error.name === "AbortError";
  console.log(aborted ? `Timed out after ${TIMEOUT_MS} ms` : "Request failed");
  process.exitCode = 1;
});
