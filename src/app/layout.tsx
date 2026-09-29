import "./globals.css";
import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/context/LanguageContext";
import ClientPWAProvider from "@/components/providers/ClientPWAProvider";

const SUPABASE_ORIGIN = "https://ahvmjptomjjnqjylofpa.supabase.co";

/** Self-hosted via next/font — avoids render-blocking Google Fonts CSS at runtime. */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  variable: "--font-sans",
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
});

const CartDrawer = dynamic(() => import("@/components/layout/CartDrawer"));
const OnboardingTour = dynamic(
  () =>
    import("@/components/onboarding/OnboardingTour").then(
      (m) => m.OnboardingTour
    ),
  { ssr: false }
);

const APP_ICON = `${SUPABASE_ORIGIN}/storage/v1/object/public/Products/ICON_APP.png`;
const FAVICON = `${SUPABASE_ORIGIN}/storage/v1/object/public/Products/FAVICON.png`;

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
    <html lang="en" className={`scroll-smooth ${inter.variable}`}>
      <head>
        {/* Critical-path DNS / TLS warm-up for remote product media + API.
            Fonts: next/font self-hosts Inter and injects correct
            <link rel="preload" as="font" crossOrigin> tags automatically —
            do not add Google Fonts preconnect/preload (causes unused warnings). */}
        <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />

        {/* Occasional remote imagery host from next/image remotePatterns */}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-slate-50/50 text-slate-900 antialiased selection:bg-sky-500 selection:text-white`}
      >
        <LanguageProvider>
          <ClientPWAProvider />
          {children}
          <CartDrawer />
          <OnboardingTour />
          <Toaster closeButton position="top-right" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
