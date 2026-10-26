import Image from "next/image";
import DriftWall from "@/components/ui/DriftWall";

const CARRIER_LOGO_BASE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CARRIERS";

const CARRIER_PARTNERS = [
  { name: "Plastipac Delivery", src: `${CARRIER_LOGO_BASE}/PLASTIPAC_DELIVERY.svg` },
  { name: "Warp", src: `${CARRIER_LOGO_BASE}/epub_Warp-logo_webp_png.webp` },
  { name: "FedEx", src: `${CARRIER_LOGO_BASE}/${encodeURI("FedEx_Express.svg")}` },
  { name: "Vocar", src: `${CARRIER_LOGO_BASE}/${encodeURI("VOCAR.png")}` },
  { name: "R+L Carriers", src: `${CARRIER_LOGO_BASE}/${encodeURI("R+L_Carriers_logo.svg")}` },
  { name: "Estes", src: `${CARRIER_LOGO_BASE}/${encodeURI("Estes_Express_Lines_logo.svg")}` },
  { name: "Saia", src: `${CARRIER_LOGO_BASE}/${encodeURI("Saia_logo.svg")}` },
  { name: "XPO", src: `${CARRIER_LOGO_BASE}/${encodeURI("XPO,_Inc_.svg")}` },
  { name: "ABF Freight", src: `${CARRIER_LOGO_BASE}/${encodeURI("ABF_Freight_System_logo.svg")}` },
  { name: "Averitt", src: `${CARRIER_LOGO_BASE}/${encodeURI("Averitt_Express_logo.svg")}` },
  { name: "Forward Air", src: `${CARRIER_LOGO_BASE}/${encodeURI("Fordward logo.svg")}` },
] as const;

export function CarrierPartners() {
  return (
    <section
      aria-labelledby="carrier-partners-heading"
      className="border-t border-slate-200/80 bg-white py-12 sm:py-16"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
            Carriers & Logistics Partners
          </p>
          <h2
            id="carrier-partners-heading"
            className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
          >
            We work with leading national and regional carriers.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
            Seamless LTL and freight integration to ensure fast, reliable delivery across the United States.
          </p>
        </div>

        <div className="hidden h-[440px] w-full lg:block">
          <DriftWall
            className="drift-wall--light"
            items={CARRIER_PARTNERS.map((carrier) => ({
              image: carrier.src,
              title: carrier.name,
            }))}
            columns={3}
            tileWidth={132}
            tileHeight={92}
            gap={14}
            radius={16}
            tilt={8}
            turn={-6}
            perspective={1400}
            depth={48}
            speed={32}
            direction="up"
            variance={0.35}
            parallax={0.35}
            lift={40}
            fade={0.35}
            dim={0.92}
            grayscale={false}
            overlayColor="#ffffff"
          />
        </div>

        <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
          {CARRIER_PARTNERS.map((carrier) => (
            <li key={carrier.name}>
              <div className="flex h-20 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <Image
                  src={carrier.src}
                  alt={`${carrier.name} logo`}
                  width={160}
                  height={40}
                  sizes="160px"
                  className="h-10 w-auto max-w-full object-contain"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
