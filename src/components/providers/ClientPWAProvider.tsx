"use client";

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
  return (
    <>
      <AppSplashScreen />
      <MobileInstallPrompt />
      <PullToRefresh />
    </>
  );
}
