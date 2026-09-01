import type { Metadata } from "next";
import "./globals.css";
import { CartDrawer } from "@/components/layout/CartDrawer";

export const metadata: Metadata = {
  title: "Plastipac USA | Industrial High-Performance Stretch Film & Packaging",
  description:
    "Leading US manufacturer of industrial cast stretch film, high-yield manual pallet wrap, and custom packaging containment solutions. Factory-direct pallet and truckload pricing.",
  keywords: [
    "stretch film",
    "pallet wrap",
    "machine stretch film",
    "hand stretch wrap",
    "Plastipac USA",
    "industrial packaging",
    "cast film manufacturer",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50/50 text-slate-900 antialiased selection:bg-sky-500 selection:text-white">
        {children}
        <CartDrawer />
      </body>
    </html>
  );
}
