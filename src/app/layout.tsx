import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { LanguageProvider } from "@/context/LanguageContext";
import ClientPWAProvider from "@/components/providers/ClientPWAProvider";

const APP_ICON =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/ICON_APP.png";
const FAVICON =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FAVICON.png";

const SITE_URL = "https://www.plastipacusa.com";
const DEFAULT_TITLE =
  "Plastipac USA | Industrial High-Performance Stretch Film & Packaging";
const DEFAULT_DESCRIPTION =
  "Leading US manufacturer of industrial cast stretch film, high-yield manual pallet wrap, and custom packaging containment solutions. Factory-direct pallet and truckload pricing.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Plastipac USA",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "stretch film",
    "pallet wrap",
    "machine stretch film",
    "hand stretch wrap",
    "Plastipac USA",
    "industrial packaging",
    "cast film manufacturer",
  ],
  applicationName: "Plastipac USA Enterprise",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Plastipac USA",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Plastipac USA — Industrial Stretch Film",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-default.jpg"],
  },
  icons: {
    icon: [
      {
        url: FAVICON,
        type: "image/png",
      },
    ],
    shortcut: [FAVICON],
    apple: [
      {
        url: APP_ICON,
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Plastipac",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen bg-slate-50/50 text-slate-900 antialiased selection:bg-sky-500 selection:text-white">
        <LanguageProvider>
          <ClientPWAProvider />
          {children}
          <CartDrawer />
          <Toaster closeButton position="top-right" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
