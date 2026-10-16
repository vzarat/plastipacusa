/**
 * Warp market-options returns carrier_name, not an image URL.
 * These marks follow that name so the quote list shows the carrier Warp priced.
 */
const BRANDS: Record<string, { bg: string; fg: string; mark: string }> = {
  "fedex-economy": { bg: "#4D148C", fg: "#FF6600", mark: "FedEx" },
  "fedex-priority": { bg: "#4D148C", fg: "#FF6600", mark: "FedEx" },
  fedex: { bg: "#4D148C", fg: "#FFFFFF", mark: "FedEx" },
  xpo: { bg: "#D71920", fg: "#FFFFFF", mark: "XPO" },
  saia: { bg: "#FFD100", fg: "#111111", mark: "SAIA" },
  estes: { bg: "#C8102E", fg: "#FFFFFF", mark: "ESTES" },
  "old-dominion": { bg: "#003366", fg: "#FFFFFF", mark: "ODFL" },
  averitt: { bg: "#0033A0", fg: "#FFFFFF", mark: "AVRT" },
  abf: { bg: "#F15A22", fg: "#FFFFFF", mark: "ABF" },
  rl: { bg: "#003DA5", fg: "#FFFFFF", mark: "R+L" },
  "forward-air": { bg: "#0B3D91", fg: "#FFFFFF", mark: "FWD" },
  forward: { bg: "#0B3D91", fg: "#FFFFFF", mark: "FWD" },
  southwestern: { bg: "#1B4F72", fg: "#FFFFFF", mark: "SMT" },
  vocar: { bg: "#0F766E", fg: "#FFFFFF", mark: "VOC" },
  ccfs: { bg: "#111827", fg: "#FFFFFF", mark: "CCFS" },
  unis: { bg: "#0E7490", fg: "#FFFFFF", mark: "UNIS" },
  "warp-technology": { bg: "#111827", fg: "#FFFFFF", mark: "WARP" },
  warp: { bg: "#111827", fg: "#FFFFFF", mark: "WARP" },
};

function brandFor(carrierKey: string | undefined, name: string) {
  const key = String(carrierKey || "").toLowerCase();
  if (BRANDS[key]) return BRANDS[key];
  const compact = name.toUpperCase();
  if (compact.includes("FEDEX")) return BRANDS.fedex;
  if (compact.includes("XPO")) return BRANDS.xpo;
  if (compact.includes("SAIA")) return BRANDS.saia;
  if (compact.includes("ESTES")) return BRANDS.estes;
  if (compact.includes("DOMINION")) return BRANDS["old-dominion"];
  if (compact.includes("AVERITT")) return BRANDS.averitt;
  if (compact.includes("ABF")) return BRANDS.abf;
  if (compact.includes("R+L") || compact.startsWith("RL")) return BRANDS.rl;
  if (compact.includes("FORWARD")) return BRANDS["forward-air"];
  if (compact.includes("WARP")) return BRANDS.warp;
  const words = name.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word));
  const mark = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
  return { bg: "#E2E8F0", fg: "#0F172A", mark: mark || "•" };
}

export function CarrierLogo({ carrierKey, name }: { carrierKey?: string; name: string }) {
  const brand = brandFor(carrierKey, name);
  return (
    <span
      aria-hidden
      title={name}
      className="mt-0.5 flex h-9 w-14 shrink-0 items-center justify-center rounded-md px-1 text-[10px] font-black tracking-tight"
      style={{ backgroundColor: brand.bg, color: brand.fg }}
    >
      {brand.mark}
    </span>
  );
}
