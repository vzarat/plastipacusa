import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 antialiased font-sans">
      {children}
    </div>
  );
}

