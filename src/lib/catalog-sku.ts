/**
 * Catalog SKUs after the rename:
 * hand film is STD|ELT|HPF-SF[width][gauge][length/100]-[1|16|32|64]B
 * machine film is HPF-SF[width][gauge][length/100]-[HLP|FLP]
 * Carts saved earlier still send FEL-, FST-, HPFSF, GEN-, or genesis-machine-film-.
 */

const OFFICIAL_HAND = /^(STD|ELT|HPF)-SF(\d{6})-(1|16|32|64)B$/;
const OFFICIAL_MACHINE = /^HPF-SF(\d{2})(\d{2})(\d{2})-(HLP|FLP)$/;

function add(keys: Set<string>, value: string) {
  const text = value.trim().toUpperCase();
  if (text) keys.add(text);
}

function qualityForLegacyPrefix(prefix: string): "ELT" | "STD" | "HPF" {
  if (prefix === "FEL" || prefix === "ELT") return "ELT";
  if (prefix === "HPF") return "HPF";
  return "STD";
}

function legacyPrefixForQuality(quality: string): string {
  if (quality === "ELT") return "FEL";
  if (quality === "HPF") return "HPF";
  return "FST";
}

/** Every SKU that should be treated as the same catalog row. */
export function catalogSkuCandidates(sku: string): string[] {
  const original = sku.trim();
  const text = original.toUpperCase();
  const keys = new Set<string>();
  if (original) keys.add(original);
  add(keys, text);

  const legacyHand = text.match(/^(FEL|FST|ELT|STD|HPF)-(\d{6})-(1|16|32|64)B$/);
  if (legacyHand) {
    add(keys, `${qualityForLegacyPrefix(legacyHand[1])}-SF${legacyHand[2]}-${legacyHand[3]}B`);
  }

  const currentHand = text.match(OFFICIAL_HAND);
  if (currentHand) {
    add(keys, `${legacyPrefixForQuality(currentHand[1])}-${currentHand[2]}-${currentHand[3]}B`);
  }

  const compactMachine = text.match(/^HPFSF(\d{6})-(HLP|FLP)$/);
  if (compactMachine) add(keys, `HPF-SF${compactMachine[1]}-${compactMachine[2]}`);

  const currentMachine = text.match(OFFICIAL_MACHINE);
  if (currentMachine) {
    const [, width, gauge, lengthCode, tier] = currentMachine;
    const rolls = tier === "HLP" ? "20" : "40";
    const lengthFeet = String(Number(lengthCode) * 100);
    add(keys, `HPFSF${width}${gauge}${lengthCode}-${tier}`);
    add(keys, `FST-${width}${gauge}${lengthFeet}-${rolls}R`);
    add(keys, `GEN-${width}${gauge}${lengthCode}-${rolls}R`);
    add(keys, `GENESIS-MACHINE-FILM-${Number(width)}-${Number(gauge)}-${lengthFeet}-${rolls}R`);
  }

  const fstMachine = text.match(/^FST-(\d{2})(\d{2})(\d{4,5})-(20|40)R$/);
  if (fstMachine) {
    const lengthCode = String(Math.round(Number(fstMachine[3]) / 100)).padStart(2, "0");
    const tier = fstMachine[4] === "20" ? "HLP" : "FLP";
    add(keys, `HPF-SF${fstMachine[1]}${fstMachine[2]}${lengthCode}-${tier}`);
  }

  const gen = text.match(/^GEN-(\d{2})(\d{2})(\d{2})-(20|40)R$/);
  if (gen) {
    const tier = gen[4] === "20" ? "HLP" : "FLP";
    add(keys, `HPF-SF${gen[1]}${gen[2]}${gen[3]}-${tier}`);
  }

  const genesis = text.match(/^GENESIS-MACHINE-FILM-(\d+)-(\d+)-(\d+)-(20|40)R$/);
  if (genesis) {
    const width = String(Number(genesis[1])).padStart(2, "0");
    const gauge = String(Number(genesis[2])).padStart(2, "0");
    const lengthCode = String(Math.round(Number(genesis[3]) / 100)).padStart(2, "0");
    const tier = genesis[4] === "20" ? "HLP" : "FLP";
    add(keys, `HPF-SF${width}${gauge}${lengthCode}-${tier}`);
  }

  return [...keys];
}

/** The SKU stored in the catalog after the rename. Unknown codes stay unchanged. */
export function canonicalCatalogSku(sku: string): string {
  const text = sku.trim().toUpperCase();
  if (!text) return "";
  if (OFFICIAL_HAND.test(text) || OFFICIAL_MACHINE.test(text)) return text;
  const official = catalogSkuCandidates(text).find(
    (key) => OFFICIAL_HAND.test(key) || OFFICIAL_MACHINE.test(key)
  );
  return official || text;
}

export function catalogSkusMatch(left: string, right: string): boolean {
  const wanted = new Set(catalogSkuCandidates(left).map((key) => key.toUpperCase()));
  return wanted.has(right.trim().toUpperCase());
}

function isCatalogCode(value: string): boolean {
  const text = value.trim().toUpperCase();
  if (!text) return false;
  return catalogSkuCandidates(text).some((key) => OFFICIAL_HAND.test(key) || OFFICIAL_MACHINE.test(key));
}

/** Product title plus the current SKU. A saved FEL/FST/HPFSF code is never shown. */
export function customerLineDescription(input: {
  productName?: string | null;
  sku?: string | null;
}): string {
  const rawName = String(input.productName || "").trim();
  const name = isCatalogCode(rawName) ? "" : rawName;
  const fromSku = canonicalCatalogSku(String(input.sku || ""));
  const sku =
    OFFICIAL_HAND.test(fromSku) || OFFICIAL_MACHINE.test(fromSku)
      ? fromSku
      : isCatalogCode(rawName)
        ? canonicalCatalogSku(rawName)
        : "";
  if (name && sku && !name.toUpperCase().includes(sku)) return `${name} · ${sku}`;
  if (name) return name;
  if (sku) return sku;
  return rawName || "Stretch Film";
}
