"use client";

import { useEffect } from "react";
import { getProducts } from "@/actions/products";
import { useCartStore } from "@/lib/store/useCartStore";

/** Refreshes cart line prices from Supabase once per page load. */
export function LiveCatalogSync() {
  const applyCatalogPrices = useCartStore((state) => state.applyCatalogPrices);

  useEffect(() => {
    let cancelled = false;
    getProducts("all")
      .then((products) => {
        if (!cancelled && products?.length) applyCatalogPrices(products);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [applyCatalogPrices]);

  return null;
}
