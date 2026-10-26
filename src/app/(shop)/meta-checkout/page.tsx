import { Suspense } from "react";
import { MetaCheckoutPage } from "@/components/checkout/MetaCheckoutPage";

export const metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function MetaCheckoutRoute() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[50vh] items-center justify-center px-6">
          <p className="text-sm font-semibold text-slate-500">Preparing your checkout…</p>
        </main>
      }
    >
      <MetaCheckoutPage />
    </Suspense>
  );
}
