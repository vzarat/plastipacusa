"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

const AppSplashScreen = dynamic(
  () => import("@/components/ui/AppSplashScreen"),
  { ssr: false }
);

const MobileInstallPrompt = dynamic(
  () => import("@/components/ui/MobileInstallPrompt"),
  { ssr: false }
);

const PullToRefresh = dynamic(
  () => import("@/components/ui/PullToRefresh"),
  { ssr: false }
);

export default function ClientPWAProvider() {
  // Production PWA builds leave a service worker that can cache stale
  // `/_next/static/chunks/*` files and cause ChunkLoadError after rebuilds.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    });

    if ("caches" in window) {
      void caches.keys().then((keys) => {
        for (const key of keys) {
          void caches.delete(key);
        }
      });
    }
  }, []);

  return (
    <>
      <AppSplashScreen />
      <MobileInstallPrompt />
      <PullToRefresh />
    </>
  );
}
