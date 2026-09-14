import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutSuccessLoading() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <div className="text-center">
          <Skeleton className="mx-auto mb-5 h-10 w-10 rounded-full" />
          <Skeleton className="mx-auto mb-4 h-4 w-36 rounded-full" />
          <Skeleton className="mx-auto mb-3 h-10 w-72 rounded-2xl" />
          <Skeleton className="mx-auto h-5 w-96 rounded-xl" />

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
            </div>
          </div>

          <div className="mt-8 flex justify-center gap-3">
            <Skeleton className="h-12 w-36 rounded-xl" />
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
