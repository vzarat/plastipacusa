import { NextResponse } from "next/server";

/** Meta can call either /checkout?products= or this URL. Cart state lives in the browser. */
export function GET(request: Request) {
  const incoming = new URL(request.url);
  const next = new URL("/meta-checkout", incoming.origin);
  const products = incoming.searchParams.get("products");
  const coupon = incoming.searchParams.get("coupon");
  if (products) next.searchParams.set("products", products);
  if (coupon) next.searchParams.set("coupon", coupon);
  return NextResponse.redirect(next);
}
