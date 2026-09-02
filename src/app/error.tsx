"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Router caught error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-6 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono uppercase text-amber-600 font-bold tracking-wider mb-2">
        System Notice
      </span>

      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
        Something Went Wrong
      </h1>

      <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
        We encountered an issue while loading this view. You can reload the page or return to the main catalog.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => reset()} variant="gradient" size="lg" className="font-bold gap-2">
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </Button>
        <Button asChild variant="outline" size="lg" className="border-slate-200 hover:bg-slate-50 gap-2">
          <Link href="/">
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

