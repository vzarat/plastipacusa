"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { applyMetaCheckoutQuery } from "@/lib/apply-meta-checkout";
import { parseMetaProducts } from "@/lib/meta-checkout";
import { checkoutLoginPath, rememberMetaCheckoutQuery } from "@/lib/meta-checkout-storage";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/store/useCartStore";

export function MetaCheckoutPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const products = params.get("products");
    const coupon = params.get("coupon");

    void (async () => {
      if (!parseMetaProducts(products)) {
        useCartStore.getState().closeDrawer();
        if (!cancelled) router.replace("/catalog");
        return;
      }

      rememberMetaCheckoutQuery(products || "", coupon);
      await applyMetaCheckoutQuery(products, coupon);
      if (cancelled) return;

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      useCartStore.getState().closeDrawer();
      router.replace(user ? "/checkout" : checkoutLoginPath());
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6">
      <p className="text-sm font-semibold text-slate-500">Preparing your checkout…</p>
    </main>
  );
}
