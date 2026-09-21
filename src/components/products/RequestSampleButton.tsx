import React from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

interface RequestSampleButtonProps {
  productSlug?: string;
  productName?: string;
  variant?: "card" | "detail";
  className?: string;
}

function buildHref(productSlug?: string, productName?: string) {
  const params = new URLSearchParams();
  if (productSlug) params.set("product", productSlug);
  if (productName) params.set("name", productName);
  const qs = params.toString();
  return qs ? `/free-sample?${qs}` : "/free-sample";
}

export function RequestSampleButton({
  productSlug,
  productName,
  variant = "card",
  className = "",
}: RequestSampleButtonProps) {
  const base =
    variant === "detail"
      ? "w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 hover:bg-blue-100 transition-colors"
      : "w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-800 hover:bg-blue-50/60 transition-colors";

  return (
    <Link
      href={buildHref(productSlug, productName)}
      className={`${base} ${className}`}
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      Request Sample
    </Link>
  );
}
