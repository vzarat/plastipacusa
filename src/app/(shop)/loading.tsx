import React from "react";
import { CategoryShowcaseSkeleton, ProductGridSkeleton } from "@/components/ui/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="space-y-0 bg-white animate-fade-in-up">
      {/* Hero Skeleton */}
      <section className="relative overflow-hidden bg-white pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <Skeleton className="w-64 h-7 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="w-full max-w-lg h-12 rounded-xl" />
                <Skeleton className="w-3/4 h-12 rounded-xl" />
              </div>
              <Skeleton className="w-full max-w-xl h-16 rounded-lg" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="w-48 h-12 rounded-xl" />
                <Skeleton className="w-48 h-12 rounded-xl" />
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl space-y-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="w-24 h-3.5 rounded" />
                    <Skeleton className="w-44 h-5 rounded-md" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 py-4 border-y border-slate-100">
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="w-36 h-4 rounded" />
                  <Skeleton className="w-28 h-8 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Showcase Skeleton */}
      <CategoryShowcaseSkeleton />

      {/* Product Grid Skeleton */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div className="space-y-2">
              <Skeleton className="w-32 h-5 rounded-full" />
              <Skeleton className="w-72 h-9 rounded-xl" />
              <Skeleton className="w-96 h-4 rounded-md" />
            </div>
            <Skeleton className="w-36 h-10 rounded-xl" />
          </div>
          <ProductGridSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}
