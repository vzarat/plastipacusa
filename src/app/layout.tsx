import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { LanguageProvider } from "@/context/LanguageContext";
import { MobileInstallPrompt } from "@/components/ui/MobileInstallPrompt";
import { AppSplashScreen } from "@/components/ui/AppSplashScreen";

const APP_ICON =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/ICON_APP.png";
const FAVICON =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FAVICON.png";

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
  applicationName: "Plastipac USA Enterprise",
  manifest: "/manifest.json",
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
  themeColor: "#0f172a",
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
        <AppSplashScreen />
        <LanguageProvider>
          {children}
          <CartDrawer />
          <MobileInstallPrompt />
          <Toaster closeButton position="top-right" richColors />
        </LanguageProvider>
      </body>
    </html>
  );
}
