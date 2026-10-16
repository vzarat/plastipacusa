"use client";

import { useState } from "react";

const CARRIER_LOGO_BASE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CARRIERS";

const CARRIER_LOGO_FALLBACK = `${CARRIER_LOGO_BASE}/carrier.svg`;

/** Exact object names in Products/CARRIERS. */
const CARRIER_LOGO_FILES: Record<string, string> = {
  abf: "ABF_Freight_System_logo.svg",
  averitt: "Averitt_Express_logo.svg",
  ccfs: "CCFS logo.png",
  estes: "Estes_Express_Lines_logo.svg",
  fedex: "FedEx_Express.svg",
  "fedex-economy": "FedEx_Express.svg",
  "fedex-priority": "FedEx_Express.svg",
  forward: "Fordward logo.svg",
  "forward-air": "Fordward logo.svg",
  rl: "R+L_Carriers_logo.svg",
  southwestern: "southwest logo.gif",
  unis: "UNIS.jpg",
  vocar: "VOCAR.png",
  warp: "epub_Warp-logo_webp_png.webp",
  "warp-technology": "epub_Warp-logo_webp_png.webp",
  xpo: "XPO,_Inc_.svg",
};

function fileKey(value: string): string {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return key || "carrier";
}

function logoFileUrl(file: string): string {
  return `${CARRIER_LOGO_BASE}/${encodeURI(file)}`;
}

/** Storage key for this quote row. Unlisted names stay on the generic file. */
export function carrierLogoSlug(carrierKey: string | undefined, name: string): string {
  const key = fileKey(carrierKey || "");
  if (key !== "carrier" && (CARRIER_LOGO_FILES[key] || key === "fedex-economy")) return key;

  const compact = name.toUpperCase();
  if (compact.includes("FEDEX") && compact.includes("ECONOMY")) return "fedex-economy";
  if (compact.includes("FEDEX") && compact.includes("PRIORITY")) return "fedex-priority";
  if (compact.includes("FEDEX")) return "fedex";
  if (compact.includes("XPO")) return "xpo";
  if (compact.includes("ESTES")) return "estes";
  if (compact.includes("AVERITT")) return "averitt";
  if (compact.includes("ABF")) return "abf";
  if (compact.includes("R+L") || compact.startsWith("RL")) return "rl";
  if (compact.includes("FORWARD")) return compact.includes("AIR") ? "forward-air" : "forward";
  if (compact.includes("SOUTHWEST")) return "southwestern";
  if (compact.includes("VOCAR")) return "vocar";
  if (compact.includes("CCFS")) return "ccfs";
  if (compact.includes("UNIS")) return "unis";
  if (compact.includes("WARP")) return "warp";
  if (key !== "carrier") return key;
  return "carrier";
}

export function carrierShowsEconomyBadge(
  carrierKey: string | undefined,
  name: string,
  serviceLevel?: string
): boolean {
  if (carrierLogoSlug(carrierKey, name) === "fedex-economy") return true;
  return String(serviceLevel || "").toUpperCase() === "ECONOMY" && /FEDEX/i.test(`${carrierKey || ""} ${name}`);
}

/** Mapped public file, then carrier.svg when that file fails. Unmapped keys use carrier.svg only. */
export function carrierLogoSources(carrierKey: string | undefined, name: string): string[] {
  const file = CARRIER_LOGO_FILES[carrierLogoSlug(carrierKey, name)];
  if (!file) return [CARRIER_LOGO_FALLBACK];
  const exact = logoFileUrl(file);
  return exact === CARRIER_LOGO_FALLBACK ? [exact] : [exact, CARRIER_LOGO_FALLBACK];
}

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
        className="mt-0.5 flex h-9 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black tracking-tight text-slate-700"
      >
        LTL
      </span>
    );
  }

  return (
    <span
      title={name}
      className="relative mt-0.5 flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white px-1"
    >
      <img
        src={src}
        alt=""
        className="h-7 w-12 object-contain"
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
