import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-emerald-200 bg-emerald-50 p-10 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">Payment received</p>
        <h1 className="mt-4 text-3xl font-black text-slate-900">Thank you for your order</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your payment has been successfully processed. A confirmation email will be sent shortly.
        </p>
        <Button asChild variant="gradient" className="mt-8">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </main>
  );
}
