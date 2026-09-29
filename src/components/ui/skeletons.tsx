import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryCardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-24 h-4 rounded-md" />
        <Skeleton className="w-48 h-6 rounded-lg" />
        <Skeleton className="w-full h-10 rounded-md" />
      </div>
      <div className="pt-4 border-t border-slate-100 flex justify-between">
        <Skeleton className="w-24 h-3.5 rounded-md" />
        <Skeleton className="w-20 h-3.5 rounded-md" />
      </div>
    </div>
  );
}

export function CategoryShowcaseSkeleton() {
  return (
    <section className="py-20 bg-slate-50/60 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <Skeleton className="w-36 h-6 rounded-full mx-auto" />
          <Skeleton className="w-72 sm:w-96 h-10 rounded-xl mx-auto" />
          <Skeleton className="w-full max-w-lg h-4 rounded-md mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
          <CategoryCardSkeleton />
        </div>
      </div>
    </section>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-sm flex flex-col justify-between">
      <div>
        {/* Image Placeholder */}
        <div className="relative h-48 w-full bg-slate-100 p-3 flex flex-col justify-between">
          <Skeleton className="w-24 h-5 rounded-full" />
          <div className="flex justify-between items-center">
            <Skeleton className="w-24 h-4 rounded-full" />
            <Skeleton className="w-20 h-4 rounded-full" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3.5">
          <Skeleton className="w-44 h-6 rounded-lg" />
          <Skeleton className="w-full h-8 rounded-md" />

          {/* Quick Specs Matrix */}
          <div className="py-3 px-3.5 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Skeleton className="w-12 h-3 rounded" />
              <Skeleton className="w-20 h-4 rounded" />
            </div>
            <div className="space-y-1">
              <Skeleton className="w-12 h-3 rounded" />
              <Skeleton className="w-20 h-4 rounded" />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Skeleton className="w-full h-3.5 rounded" />
            <Skeleton className="w-5/6 h-3.5 rounded" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pt-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="w-16 h-2.5 rounded" />
          <Skeleton className="w-20 h-6 rounded-md" />
        </div>
        <Skeleton className="w-24 h-8 rounded-xl" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="py-10 bg-slate-50/40 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Breadcrumb Skeleton */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-12 h-4 rounded" />
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="w-16 h-4 rounded" />
          <Skeleton className="w-3 h-3 rounded-full" />
          <Skeleton className="w-32 h-4 rounded" />
        </div>

        {/* Top Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Gallery & Tech Specs */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden p-2">
              <Skeleton className="w-full h-[380px] rounded-2xl" />
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white p-7 space-y-4">
              <Skeleton className="w-48 h-5 rounded-md" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Skeleton className="w-full h-4 rounded" />
                <Skeleton className="w-full h-4 rounded" />
                <Skeleton className="w-full h-4 rounded" />
                <Skeleton className="w-full h-4 rounded" />
              </div>
            </div>
          </div>

          {/* Right Column: Variant Selector & Title */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="w-32 h-4 rounded" />
              <Skeleton className="w-3/4 h-8 rounded-lg" />
              <Skeleton className="w-full h-12 rounded-md mt-2" />
            </div>

            {/* Selector Box */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex justify-between pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <Skeleton className="w-28 h-3 rounded" />
                  <Skeleton className="w-36 h-5 rounded-md" />
                </div>
                <Skeleton className="w-24 h-6 rounded-full" />
              </div>

              <div className="space-y-2">
                <Skeleton className="w-40 h-4 rounded" />
                <div className="grid grid-cols-3 gap-2">
                  <Skeleton className="h-10 rounded-2xl" />
                  <Skeleton className="h-10 rounded-2xl" />
                  <Skeleton className="h-10 rounded-2xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="w-40 h-4 rounded" />
                <div className="grid grid-cols-4 gap-2">
                  <Skeleton className="h-10 rounded-2xl" />
                  <Skeleton className="h-10 rounded-2xl" />
                  <Skeleton className="h-10 rounded-2xl" />
                  <Skeleton className="h-10 rounded-2xl" />
                </div>
              </div>

              <div className="space-y-2">
                <Skeleton className="w-44 h-4 rounded" />
                <div className="grid grid-cols-3 gap-3">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <Skeleton className="w-28 h-10 rounded-xl" />
                <Skeleton className="w-44 h-12 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Table Skeleton */}
        <div className="pt-8 border-t border-slate-200 space-y-4">
          <div className="flex justify-between">
            <div className="space-y-1">
              <Skeleton className="w-64 h-6 rounded-lg" />
              <Skeleton className="w-96 h-4 rounded" />
            </div>
            <Skeleton className="w-24 h-6 rounded-full" />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <Skeleton className="w-full h-8 rounded-lg" />
            <Skeleton className="w-full h-8 rounded-lg" />
            <Skeleton className="w-full h-8 rounded-lg" />
            <Skeleton className="w-full h-8 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
