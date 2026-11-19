import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getAppBaseUrl } from "@/lib/email";
import { SalesQuotePdfDocument } from "./pdf";
import type { SalesQuoteRecord } from "./types";

function acceptUrlForToken(token: string): string {
  return `${getAppBaseUrl()}/quotes/accept/${token}`;
}

export async function renderSalesQuotePdfBuffer(
  quote: SalesQuoteRecord
): Promise<Buffer> {
  const element = React.createElement(SalesQuotePdfDocument, {
    quote,
    acceptUrl: acceptUrlForToken(quote.token),
  });
  const nodeBuffer = await renderToBuffer(
    element as Parameters<typeof renderToBuffer>[0]
  );
  return Buffer.from(nodeBuffer);
}
