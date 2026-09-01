import React from "react";
import { ProductDetailSkeleton } from "@/components/ui/skeletons";

export default function ProductDetailLoading() {
  return (
    <div className="animate-fade-in-up">
      <ProductDetailSkeleton />
    </div>
  );
}
