"use client";

import { useEffect } from "react";
import { getProducts } from "@/actions/products";
import { useCartStore } from "@/lib/store/useCartStore";

/** Refreshes cart line prices from catalog only when the cart has items. */
export function LiveCatalogSync() {
  const itemCount = useCartStore((state) => state.items.length);
  const applyCatalogPrices = useCartStore((state) => state.applyCatalogPrices);

  useEffect(() => {
    if (itemCount === 0) return;

    let cancelled = false;
    getProducts("all")
      .then((products) => {
        if (!cancelled && products?.length) applyCatalogPrices(products);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [applyCatalogPrices, itemCount]);

  return null;
}
