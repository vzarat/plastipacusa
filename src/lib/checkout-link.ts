/**
 * Destination for storefront direct checkout / payment / quote flows.
 * Configure via NEXT_PUBLIC_CHECKOUT_LINK in environment.
 */
export const DIRECT_CHECKOUT_LINK =
  process.env.NEXT_PUBLIC_CHECKOUT_LINK?.trim() || "#";

export function openDirectCheckoutLink(): void {
  if (typeof window === "undefined") return;

  const link = DIRECT_CHECKOUT_LINK;
  if (!link || link === "#") {
    window.location.href = "/#contact";
    return;
  }

  window.open(link, "_blank", "noopener,noreferrer");
}
