import React from "react";
import Link from "next/link";

interface LegalPageShellProps {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/shipping-policy", label: "Shipping Policy" },
] as const;

export function LegalPageShell({ title, effectiveDate, children }: LegalPageShellProps) {
  return (
    <div className="py-12 sm:py-16 bg-white min-h-screen animate-fade-in-up">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-sky-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <header className="mb-10 space-y-3 border-b border-slate-200 pb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Legal & Policies
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-slate-500">
            Effective Date: {effectiveDate} · Plastipac USA
          </p>
        </header>

        <article className="legal-prose space-y-8 text-sm leading-relaxed text-slate-600 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_a]:text-sky-700 [&_a]:font-medium hover:[&_a]:underline [&_strong]:text-slate-800">
          {children}
        </article>

        <footer className="mt-12 pt-8 border-t border-slate-200 text-xs text-slate-500 space-y-2">
          <p>
            Questions about this policy? Contact us at{" "}
            <a href="mailto:contact@plastipacusa.com" className="text-sky-700 font-medium hover:underline">
              contact@plastipacusa.com
            </a>{" "}
            or call{" "}
            <a href="tel:+19564003683" className="text-sky-700 font-medium hover:underline">
              (956) 400-3683
            </a>
            .
          </p>
          <p>
            Plastipac USA · Industrial stretch film & packaging · South Texas & Northern Mexico
          </p>
        </footer>
      </div>
    </div>
  );
}
