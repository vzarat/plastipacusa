"use client";

import React, { useState } from "react";
import { FlaskConical } from "lucide-react";
import { FreeSampleRequestModal } from "@/components/home/FreeSampleRequestModal";

interface RequestSampleButtonProps {
  productSlug?: string;
  productName?: string;
  variant?: "card" | "detail";
  className?: string;
}

export function RequestSampleButton({
  productSlug,
  productName,
  variant = "card",
  className = "",
}: RequestSampleButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const base =
    variant === "detail"
      ? "w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 hover:bg-blue-100 transition-colors cursor-pointer"
      : "w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-800 hover:bg-blue-50/60 transition-colors cursor-pointer";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${base} ${className}`}
      >
        <FlaskConical className="h-3.5 w-3.5 shrink-0" />
        Request Sample
      </button>

      <FreeSampleRequestModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        productSlug={productSlug}
        productName={productName}
      />
    </>
  );
}
