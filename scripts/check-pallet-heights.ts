import { auditCatalogProduct } from "../src/lib/shipping/catalog-freight";
import { HAND_FREIGHT_DIMENSIONS_IN } from "../src/lib/shipping/hand-freight";
import {
  PALLET_BASE_HEIGHT_IN,
  resolveFullPalletHeight,
  tierInchesFromFullHeight,
} from "../src/lib/shipping/tier-height";

interface Film {
  slug: string;
  application: "hand" | "machine";
  boxWeightLbs: number | null;
  palletWeightLbs: number | null;
  widthInches: number;
}

const films: Film[] = [
  ["stretch-film-18-x-60-ga-x-1000ft", "hand", 24.6, 1596.7, 18],
  ["stretch-film-18-x-70-ga-x-1000ft", "hand", 27.51, 1783, 18],
  ["stretch-film-18-x-80-ga-x-1000ft", "hand", 34.65, 2240.2, 18],
  ["stretch-film-18-x-60-ga-x-1500ft", "hand", 30.42, 1969.2, 18],
  ["stretch-film-18-x-70-ga-x-1500ft", "hand", 34.74, 2245.8, 18],
  ["stretch-film-18-x-80-ga-x-1500ft", "hand", 39.07, 2522.3, 18],
  ["stretch-film-15-x-40-ga-x-1500ft", "hand", 18, 1173.5, 15],
  ["stretch-film-15-x-60-ga-x-1000ft", "hand", 25.13, 1637.5, 15],
  ["stretch-film-15-x-60-ga-x-1500ft", "hand", 25.13, 1630.5, 15],
  ["stretch-film-15-x-70-ga-x-1500ft", "hand", 28.75, 1862, 15],
  ["stretch-film-15-x-80-ga-x-1500ft", "hand", 32.36, 2093.3, 15],
  ["stretch-film-20-x-51-ga-x-7000ft", "machine", null, 1246.1, 20],
  ["stretch-film-20-x-51-ga-x-9000ft", "machine", null, 1573.3, 20],
  ["stretch-film-20-x-60-ga-x-5000ft", "machine", null, 1058, 20],
  ["stretch-film-20-x-70-ga-x-5000ft", "machine", null, 1224.1, 20],
  ["stretch-film-20-x-80-ga-x-5000ft", "machine", null, 1384.5, 20],
  ["stretch-film-20-x-60-ga-x-6000ft", "machine", null, null, 20],
  ["stretch-film-20-x-70-ga-x-6000ft", "machine", null, null, 20],
  ["stretch-film-20-x-80-ga-x-6000ft", "machine", null, null, 20],
].map(([slug, application, boxWeightLbs, palletWeightLbs, widthInches]) => ({
  slug: String(slug),
  application: application as "hand" | "machine",
  boxWeightLbs: boxWeightLbs as number | null,
  palletWeightLbs: palletWeightLbs as number | null,
  widthInches: Number(widthInches),
}));

const boxHeight = HAND_FREIGHT_DIMENSIONS_IN.loose.heightIn;
console.log(`PALLET_BASE_HEIGHT_IN = ${PALLET_BASE_HEIGHT_IN}`);
console.log("product\tfull in\thalf in\tlayer in\tbox in\tflag");
for (const film of films) {
  const full = resolveFullPalletHeight({
    application: film.application,
    widthInches: film.widthInches,
    palletDimensions: null,
  });
  const half = full ? tierInchesFromFullHeight({ fullHeightIn: full.heightIn, tier: "half" }) : null;
  const layer = full ? tierInchesFromFullHeight({ fullHeightIn: full.heightIn, tier: "layer" }) : null;
  const shownBox = film.application === "hand" ? boxHeight : null;
  const flag =
    full && shownBox != null && full.heightIn === shownBox * 4
      ? "FLAG full height equals 4 x box height (pallet base may be missing)"
      : "—";
  console.log(
    [film.slug, full?.heightIn ?? "missing", half?.heightIn ?? "missing", layer?.heightIn ?? "missing", shownBox ?? "no box tier", flag].join("\t")
  );
}

console.log("\nproduct\ttier\tquotable\tmissing field");
const missing: string[] = [];
for (const film of films) {
  const rows = auditCatalogProduct({
    name: film.slug,
    slug: film.slug,
    application: film.application,
    boxWeightLbs: film.boxWeightLbs,
    palletWeightLbs: film.palletWeightLbs,
    boxesCount: film.application === "hand" ? 1 : null,
    rollsCount: film.application === "hand" ? 4 : 20,
    widthInches: film.widthInches,
    dimensions: {},
  });
  for (const row of rows) {
    const quotable = row.weight === "present" && row.dimensions === "present" ? "yes" : "no";
    console.log([row.product, row.tier, quotable, quotable === "yes" ? "—" : row.fieldsToFill].join("\t"));
    if (quotable === "no") missing.push(film.slug);
  }
}

const slugs = [...new Set(missing)];
console.log(`
-- Not applied. Enter the package-table pounds, then run this yourself.
-- Admin fields: products.roll_weight_lbs, products.pallet_weight_lbs,
-- product_variants.roll_weight_lbs, product_variants.pallet_weight_lbs.
UPDATE public.products AS p
SET roll_weight_lbs = spec.roll_lbs,
    pallet_weight_lbs = spec.pallet_lbs
FROM (VALUES
${slugs.map((slug) => `  ('${slug}', NULL::numeric, NULL::numeric)`).join(",\n")}
) AS spec(slug, roll_lbs, pallet_lbs)
WHERE p.slug = spec.slug
  AND spec.roll_lbs IS NOT NULL
  AND spec.pallet_lbs IS NOT NULL;

UPDATE public.product_variants AS v
SET roll_weight_lbs = spec.roll_lbs,
    box_weight_lbs = CASE WHEN p.application = 'machine' THEN spec.roll_lbs ELSE v.box_weight_lbs END,
    pallet_weight_lbs = spec.pallet_lbs
FROM public.products AS p
JOIN (VALUES
${slugs.map((slug) => `  ('${slug}', NULL::numeric, NULL::numeric)`).join(",\n")}
) AS spec(slug, roll_lbs, pallet_lbs) ON p.slug = spec.slug
WHERE v.product_id = p.id
  AND spec.roll_lbs IS NOT NULL
  AND spec.pallet_lbs IS NOT NULL;
`);
