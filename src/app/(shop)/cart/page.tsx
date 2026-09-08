"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/useCartStore";

export default function CartPage() {
  const router = useRouter();
  const openDrawer = useCartStore((state) => state.openDrawer);

  useEffect(() => {
    openDrawer();
    router.replace("/products");
  }, [openDrawer, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <p className="text-sm font-semibold text-slate-500 animate-pulse">
        Opening cart...
      </p>
    </div>
  );
}

