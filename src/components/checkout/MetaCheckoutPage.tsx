"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyMetaCheckoutQuery } from "@/lib/apply-meta-checkout";

export function MetaCheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    const products = params.get("products");
    const coupon = params.get("coupon");
    void applyMetaCheckoutQuery(products, coupon).then((ok) => {
      if (cancelled) return;
      router.replace(ok ? "/checkout" : "/catalog");
    });
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6">
      <p className="text-sm font-semibold text-slate-500">Preparing your checkout…</p>
    </main>
  );
}
