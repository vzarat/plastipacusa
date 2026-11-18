import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";

const POLICY_LINKS = [
  { href: "/shipping-policy#third-party-carriers", label: "Shipping Policy" },
  { href: "/terms-of-service", label: "Terms" },
  { href: "/refund-policy", label: "Refunds" },
] as const;

/** Compact secure-checkout mark + policy tabs (full carrier text lives on policy pages). */
export function CheckoutTrustFooter() {
  return (
    <div className="mt-6 space-y-3 border-t border-slate-200 pt-4">
      <div className="flex items-center gap-2 text-slate-800">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900">Secure purchase</p>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Lock className="h-3 w-3 shrink-0" aria-hidden />
            Card payments processed by Stripe
          </p>
        </div>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        Outside local RGV / Houston Friday delivery, freight is quoted via third-party carriers. Details:{" "}
        {POLICY_LINKS.map((link, index) => (
          <span key={link.href}>
            {index > 0 ? " · " : null}
            <Link
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-700 hover:underline"
            >
              {link.label}
            </Link>
          </span>
        ))}
        .
      </p>
    </div>
  );
}
