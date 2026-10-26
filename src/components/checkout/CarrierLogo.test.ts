import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { carrierLogoSources, carrierShowsEconomyBadge } from "./CarrierLogo";

const BASE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CARRIERS";

describe("carrier logo storage paths", () => {
  it("uses the uploaded object name, then carrier.svg", () => {
    assert.deepEqual(carrierLogoSources("xpo", "XPO"), [
      `${BASE}/${encodeURI("XPO,_Inc_.svg")}`,
      `${BASE}/carrier.svg`,
    ]);
    assert.deepEqual(carrierLogoSources("rl", "RL Carriers"), [
      `${BASE}/${encodeURI("R+L_Carriers_logo.svg")}`,
      `${BASE}/carrier.svg`,
    ]);
    assert.equal(
      carrierLogoSources("forward-air", "Forward Air")[0],
      `${BASE}/${encodeURI("Fordward logo.svg")}`
    );
  });

  it("uses the FedEx mark for economy and priority, and badges economy only", () => {
    const fedex = `${BASE}/${encodeURI("FedEx_Express.svg")}`;
    assert.equal(carrierLogoSources("fedex-economy", "FedEx Freight Economy")[0], fedex);
    assert.equal(carrierLogoSources("fedex-priority", "FedEx Freight Priority")[0], fedex);
    assert.equal(carrierShowsEconomyBadge("fedex-economy", "FedEx Freight Economy"), true);
    assert.equal(carrierShowsEconomyBadge("fedex-priority", "FedEx Freight Priority"), false);
  });

  it("uses the Saia logo, and unmapped carriers stay on carrier.svg", () => {
    assert.deepEqual(carrierLogoSources("saia", "Saia"), [
      `${BASE}/${encodeURI("Saia_logo.svg")}`,
      `${BASE}/carrier.svg`,
    ]);
    assert.deepEqual(carrierLogoSources(undefined, "Unknown Freight"), [
      `${BASE}/carrier.svg`,
    ]);
  });

  it("uses the Plastipac delivery mark for Houston and RGV Friday delivery", () => {
    const plastipac = `${BASE}/${encodeURI("PLASTIPAC_DELIVERY.svg")}`;
    assert.equal(
      carrierLogoSources("plastipac", "Houston / RGV Friday Free Delivery (Scheduled)")[0],
      plastipac
    );
    assert.equal(
      carrierLogoSources(undefined, "Houston / RGV Friday Free Delivery (Scheduled)")[0],
      plastipac
    );
  });
});
