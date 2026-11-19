import { getAppBaseUrl } from "@/lib/email";
import { buildSalesQuotePdfBuffer } from "./pdf";
import type { SalesQuoteRecord } from "./types";

function acceptUrlForToken(token: string): string {
  return `${getAppBaseUrl()}/quotes/accept/${token}`;
}

export async function renderSalesQuotePdfBuffer(
  quote: SalesQuoteRecord
): Promise<Buffer> {
  return buildSalesQuotePdfBuffer({
    quote,
    acceptUrl: acceptUrlForToken(quote.token),
  });
}
