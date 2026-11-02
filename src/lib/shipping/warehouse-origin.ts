/**
 * Structured warehouse pickup origin for Warp API.
 * Street / city / state / ZIP are the only fields sent as origin address.
 * Dock notes stay for ops / BOL and are never sent as fake street text.
 */

export type WarehouseOriginAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  dockNotes: string;
};

/** Real McAllen warehouse — never marketing or placeholder terminal names. */
export const DEFAULT_WAREHOUSE_ORIGIN: WarehouseOriginAddress = {
  street: "5801 George McVay Dr",
  city: "McAllen",
  state: "TX",
  zip: "78503",
  dockNotes: "",
};

export const WARP_ORIGIN_COUNTRY = "US";

/** Marketing / generic labels that must never go to Warp as street. */
const PLACEHOLDER_STREET =
  /commercial\s+warehouse\s+terminal|cross[-\s]?dock|distribution\s+center|laredo\s+commercial|^texas$|example|placeholder|1234\s+e\s+expressway/i;

let cachedOrigin: WarehouseOriginAddress | null = null;
let loadPromise: Promise<WarehouseOriginAddress> | null = null;

function trim(value: unknown): string {
  return String(value ?? "").trim();
}

export function isUsableStreet(street: string): boolean {
  const value = street.trim();
  if (value.length < 5) return false;
  if (!/\d/.test(value)) return false;
  if (PLACEHOLDER_STREET.test(value)) return false;
  return true;
}

export function sanitizeWarehouseOrigin(
  input?: Partial<WarehouseOriginAddress> | null
): WarehouseOriginAddress {
  const street = trim(input?.street);
  const city = trim(input?.city);
  const state = trim(input?.state).toUpperCase();
  const zipRaw = trim(input?.zip).replace(/\s+/g, "");
  const zip = /^\d{5}(-\d{4})?$/.test(zipRaw) ? zipRaw.slice(0, 5) : "";
  const dockNotes = trim(input?.dockNotes);

  return {
    street: isUsableStreet(street) ? street : DEFAULT_WAREHOUSE_ORIGIN.street,
    city: city.length >= 2 ? city : DEFAULT_WAREHOUSE_ORIGIN.city,
    state: /^[A-Z]{2}$/.test(state) ? state : DEFAULT_WAREHOUSE_ORIGIN.state,
    zip: zip || DEFAULT_WAREHOUSE_ORIGIN.zip,
    dockNotes,
  };
}

export function validateWarehouseOriginForSave(
  input: Partial<WarehouseOriginAddress>
): { ok: true; value: WarehouseOriginAddress } | { ok: false; error: string } {
  const street = trim(input.street);
  const city = trim(input.city);
  const state = trim(input.state).toUpperCase();
  const zipRaw = trim(input.zip).replace(/\s+/g, "");
  const dockNotes = trim(input.dockNotes);

  if (!isUsableStreet(street)) {
    return {
      ok: false,
      error:
        "Street Address must be a real street with a number (not a terminal label or placeholder).",
    };
  }
  if (city.length < 2) {
    return { ok: false, error: "City is required." };
  }
  if (!/^[A-Z]{2}$/.test(state)) {
    return { ok: false, error: "State must be a 2-letter code (e.g. TX)." };
  }
  if (!/^\d{5}(-\d{4})?$/.test(zipRaw)) {
    return { ok: false, error: "ZIP Code must be a valid 5-digit US ZIP." };
  }

  return {
    ok: true,
    value: {
      street,
      city,
      state,
      zip: zipRaw.slice(0, 5),
      dockNotes,
    },
  };
}

/** Sync read — defaults until ensureWarehouseOriginLoaded() runs. */
export function getWarehouseOrigin(): WarehouseOriginAddress {
  return sanitizeWarehouseOrigin(cachedOrigin ?? DEFAULT_WAREHOUSE_ORIGIN);
}

export function setWarehouseOriginCache(origin: WarehouseOriginAddress): void {
  cachedOrigin = sanitizeWarehouseOrigin(origin);
}

export function clearWarehouseOriginCache(): void {
  cachedOrigin = null;
  loadPromise = null;
}

/**
 * Address block Warp receives for pickup / market-options origin.
 * Never includes dock notes or placeholder text.
 */
export function warpOriginAddressPayload(
  origin: WarehouseOriginAddress = getWarehouseOrigin()
): {
  street: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
} {
  const safe = sanitizeWarehouseOrigin(origin);
  return {
    street: safe.street,
    city: safe.city,
    state: safe.state,
    zipcode: safe.zip,
    country: WARP_ORIGIN_COUNTRY,
  };
}

type WarehouseOriginLoader = () => Promise<WarehouseOriginAddress>;

let externalLoader: WarehouseOriginLoader | null = null;

/** Wired once from the store module to avoid circular imports. */
export function registerWarehouseOriginLoader(loader: WarehouseOriginLoader): void {
  externalLoader = loader;
}

/** Load from DB (or defaults) and refresh the sync cache used by Warp helpers. */
export async function ensureWarehouseOriginLoaded(): Promise<WarehouseOriginAddress> {
  if (cachedOrigin) return getWarehouseOrigin();
  if (!loadPromise) {
    loadPromise = (async () => {
      if (!externalLoader) {
        setWarehouseOriginCache(DEFAULT_WAREHOUSE_ORIGIN);
        return getWarehouseOrigin();
      }
      try {
        const loaded = await externalLoader();
        setWarehouseOriginCache(loaded);
      } catch {
        setWarehouseOriginCache(DEFAULT_WAREHOUSE_ORIGIN);
      }
      return getWarehouseOrigin();
    })().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}
