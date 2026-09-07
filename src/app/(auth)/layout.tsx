import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldCheck, PhoneCall } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center group py-1.5">
            <Image
              src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
              alt="Plastipac USA - Commercial Client Portal"
              width={220}
              height={60}
              priority
              className="h-10 sm:h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
            />
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="hidden sm:flex items-center gap-1.5 text-slate-500">
              <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
              <span>Commercial Support: </span>
              <a href="tel:+19564003683" className="text-slate-900 hover:text-sky-600 font-bold">
                (956) 400 36 83
              </a>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-sky-600 hover:border-sky-300 transition-colors bg-white shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-Bit Encrypted B2B Client Portal</span>
          </div>
          <div>
            © {new Date().getFullYear()} Plastipac USA LLC. Factory-Direct Industrial Stretch Film.
          </div>
        </div>
      </footer>
    </div>
  );
}

