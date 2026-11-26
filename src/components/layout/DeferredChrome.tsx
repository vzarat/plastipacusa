"use client";

import dynamic from "next/dynamic";

const CartDrawer = dynamic(() => import("@/components/layout/CartDrawer"), {
  ssr: false,
});

const AssistAI = dynamic(() => import("@/components/AssistAI"), {
  ssr: false,
});

/** Client-only chrome so root layout can stay a Server Component. */
export function DeferredChrome() {
  return (
    <>
      <CartDrawer />
      <AssistAI />
    </>
  );
}
