/** Machine film SKU: HPFSF[WIDTH][GAUGE][LENGTH/100]-[HLP|FLP]. Example: HPFSF205170-HLP. */

const OFFICIAL_MACHINE_SPECS = [
  { width: 20, gauge: 51, length: 7000 },
  { width: 20, gauge: 51, length: 9000 },
  { width: 20, gauge: 70, length: 5000 },
  { width: 20, gauge: 80, length: 5000 },
] as const;

function isOfficialMachineSpec(width: number, gauge: number, lengthFeet: number): boolean {
  return OFFICIAL_MACHINE_SPECS.some(
    (spec) => spec.width === width && spec.gauge === gauge && spec.length === lengthFeet
  );
}

/** 20" x 51 GA x 7,000 ft → 205170. No hyphen between SF and the measurement. */
export function machineFilmMeasurementCode(
  widthInches: number,
  gauge: number,
  lengthFeet: number
): string | null {
  const width = Math.round(widthInches);
  const filmGauge = Math.round(gauge);
  const lengthCode = Math.round(lengthFeet / 100);
  if (!isOfficialMachineSpec(width, filmGauge, Math.round(lengthFeet))) return null;
  if (width <= 0 || filmGauge <= 0 || lengthCode <= 0) return null;
  return `${String(width).padStart(2, "0")}${String(filmGauge).padStart(2, "0")}${String(lengthCode).padStart(2, "0")}`;
}

export function machineFilmBaseSku(
  widthInches?: number | string | null,
  gauge?: number | string | null,
  lengthFeet?: number | string | null
): string | null {
  const measurement = machineFilmMeasurementCode(
    Number(widthInches),
    Number(gauge),
    Number(lengthFeet)
  );
  if (!measurement) return null;
  return `HPFSF${measurement}`;
}

/** Half pallet is HLP (20 rolls). Full pallet is FLP (40 rolls). Rolls ship with no boxes. */
export function machineFilmTierSku(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  rolls?: number | null;
}): string | null {
  const base = machineFilmBaseSku(input.widthInches, input.gauge, input.lengthFeet);
  const rolls = Math.round(Number(input.rolls));
  const suffix = rolls === 20 ? "HLP" : rolls === 40 ? "FLP" : null;
  if (!base || !suffix) return null;
  return `${base}-${suffix}`;
}
