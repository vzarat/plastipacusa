import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="mb-6 h-7 w-44 rounded-full" />
          <Skeleton className="mb-4 h-12 w-full rounded-2xl" />
          <Skeleton className="mb-4 h-12 w-full rounded-2xl" />
          <Skeleton className="mb-4 h-12 w-full rounded-2xl" />
          <Skeleton className="mb-6 h-12 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="mb-4 h-6 w-28 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-4/6 rounded" />
          </div>
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-6">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        </aside>
      </div>
    </main>
  );
}
