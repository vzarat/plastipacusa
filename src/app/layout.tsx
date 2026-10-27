import "./globals.css";
import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Inter, Teko } from "next/font/google";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/context/LanguageContext";
import ClientPWAProvider from "@/components/providers/ClientPWAProvider";
import { OnboardingTourWrapper } from "@/components/onboarding/OnboardingTourWrapper";
import { Analytics } from "@vercel/analytics/next";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { metaPixelId, metaPixelSnippet } from "@/lib/meta-pixel";
import { META_CHECKOUT_BOOTSTRAP_SCRIPT } from "@/lib/meta-checkout-storage";

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

const teko = Teko({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-teko",
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
});

const CartDrawer = dynamic(() => import("@/components/layout/CartDrawer"));
const AssistAI = dynamic(() => import("@/components/AssistAI"));

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
  verification: {
    other: {
      "facebook-domain-verification": "6acvmeypgj4fmj6048ztrj86o121ou",
    },
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
  const pixelId = metaPixelId();

  return (
    <html lang="en" className={`scroll-smooth ${inter.variable} ${teko.variable}`}>
      <head>
        {/* Critical-path DNS / TLS warm-up for remote product media + API.
            Fonts: next/font self-hosts Inter and injects correct
            <link rel="preload" as="font" crossOrigin> tags automatically —
            do not add Google Fonts preconnect/preload (causes unused warnings). */}
        <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={SUPABASE_ORIGIN} />

        {/* Occasional remote imagery host from next/image remotePatterns */}
        <link rel="dns-prefetch" href="https://images.unsplash.com" />

        <script dangerouslySetInnerHTML={{ __html: META_CHECKOUT_BOOTSTRAP_SCRIPT }} />

        {pixelId ? (
          <script dangerouslySetInnerHTML={{ __html: metaPixelSnippet(pixelId) }} />
        ) : null}
      </head>
      <body
        className={`${inter.className} min-h-screen bg-slate-50/50 text-slate-900 antialiased selection:bg-sky-500 selection:text-white`}
      >
        <LanguageProvider>
          <MetaPixel />
          {pixelId ? (
            <noscript>
              {/* Meta's required fallback. next/image cannot emit this 1×1 tracking pixel. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          ) : null}
          <ClientPWAProvider />
          {children}
          <CartDrawer />
          <AssistAI />
          <OnboardingTourWrapper />
          <Toaster closeButton position="top-right" richColors />
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
