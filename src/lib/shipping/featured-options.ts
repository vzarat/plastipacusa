export interface FeaturedOption {
  id: string;
  price: number;
  transitDays: number;
  serviceLevel?: string;
}

/** Cheapest, fastest, and cheapest guaranteed, then the next lowest prices, up to five. */
export function featuredCarrierOptions<T extends FeaturedOption>(
  options: T[],
  limit = 5
): { shown: T[]; hidden: T[] } {
  const byPrice = [...options].sort((a, b) => a.price - b.price || a.transitDays - b.transitDays);
  if (byPrice.length <= limit) return { shown: byPrice, hidden: [] };
  const cheapest = byPrice[0];
  const fastest = [...byPrice].sort((a, b) => a.transitDays - b.transitDays || a.price - b.price)[0];
  const guaranteed = byPrice.find((option) => option.serviceLevel === "GUARANTEED");
  const picked: T[] = [];
  for (const option of [cheapest, fastest, guaranteed]) {
    if (option && !picked.some((item) => item.id === option.id)) picked.push(option);
  }
  for (const option of byPrice) {
    if (picked.length >= limit) break;
    if (!picked.some((item) => item.id === option.id)) picked.push(option);
  }
  const shownIds = new Set(picked.map((option) => option.id));
  return {
    shown: picked.sort((a, b) => a.price - b.price),
    hidden: byPrice.filter((option) => !shownIds.has(option.id)),
  };
}
