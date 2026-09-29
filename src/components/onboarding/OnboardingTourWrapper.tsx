"use client";

import dynamic from "next/dynamic";

const OnboardingTour = dynamic(
  () =>
    import("@/components/onboarding/OnboardingTour").then((m) => m.OnboardingTour),
  { ssr: false }
);

export function OnboardingTourWrapper() {
  return <OnboardingTour />;
}
