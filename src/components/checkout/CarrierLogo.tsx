"use client";

import { useState } from "react";

export {
  carrierLogoSlug,
  carrierLogoSources,
  carrierShowsEconomyBadge,
} from "@/lib/shipping/carrier-logo";
import { carrierLogoSources, carrierShowsEconomyBadge } from "@/lib/shipping/carrier-logo";

export function CarrierLogo({
  carrierKey,
  name,
  serviceLevel,
}: {
  carrierKey?: string;
  name: string;
  serviceLevel?: string;
}) {
  const sources = carrierLogoSources(carrierKey, name);
  const economy = carrierShowsEconomyBadge(carrierKey, name, serviceLevel);
  const [step, setStep] = useState(0);
  const [sourceKey, setSourceKey] = useState(sources.join("|"));
  if (sourceKey !== sources.join("|")) {
    setSourceKey(sources.join("|"));
    setStep(0);
  }
  const src = sources[step];
  if (!src) {
    return (
      <span
        aria-hidden
        title={name}
        className="mt-0.5 flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black tracking-tight text-slate-700"
      >
        LTL
      </span>
    );
  }

  return (
    <span
      title={name}
      className="relative mt-0.5 flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white px-1.5"
    >
      <img
        src={src}
        alt=""
        className="h-8 w-14 object-contain"
        onError={() => setStep((current) => (current + 1 < sources.length ? current + 1 : sources.length))}
      />
      {economy ? (
        <span className="absolute bottom-0 left-0 right-0 bg-slate-900/90 text-center text-[8px] font-bold uppercase leading-3 tracking-wide text-white">
          Economy
        </span>
      ) : null}
    </span>
  );
}
