import React from "react";
import { ProductCardSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="py-12 bg-slate-50/40 min-h-[calc(100vh-200px)] animate-fade-in-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="mb-10 space-y-2">
          <Skeleton className="w-36 h-5 rounded-full" />
          <Skeleton className="w-96 h-10 rounded-xl" />
          <Skeleton className="w-full max-w-xl h-4 rounded-md" />
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 rounded-3xl border border-slate-200/90 bg-white p-6 space-y-6 shadow-sm">
            <div className="flex justify-between pb-3 border-b border-slate-100">
              <Skeleton className="w-24 h-5 rounded" />
              <Skeleton className="w-12 h-4 rounded" />
            </div>
            <div className="space-y-2">
              <Skeleton className="w-28 h-4 rounded" />
              <div className="space-y-2">
                <Skeleton className="w-full h-9 rounded-xl" />
                <Skeleton className="w-full h-9 rounded-xl" />
                <Skeleton className="w-full h-9 rounded-xl" />
              </div>
            </div>
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <Skeleton className="w-24 h-4 rounded" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-8 rounded-xl" />
                <Skeleton className="h-8 rounded-xl" />
                <Skeleton className="h-8 rounded-xl" />
                <Skeleton className="h-8 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
              <ProductCardSkeleton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
