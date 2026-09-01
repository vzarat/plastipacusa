import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Layers, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-600 to-blue-700 text-white flex items-center justify-center mb-6 shadow-lg shadow-sky-500/20">
        <Layers className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono uppercase text-sky-600 font-bold tracking-wider mb-2">
        Error 404
      </span>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
        Page Not Found
      </h1>

      <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
        The stretch film product or page you are looking for does not exist or has been moved.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="gradient" size="lg" className="font-bold">
          <Link href="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Return to Homepage</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="border-slate-200 hover:bg-slate-50">
          <Link href="/products">
            <span>Explore Catalog</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
