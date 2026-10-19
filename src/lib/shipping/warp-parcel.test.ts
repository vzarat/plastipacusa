import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FreightPiece, ShipmentFreight } from "./types";
import { handBoxHeightIn, warpHandPieces } from "./hand-freight";
import { usesWarpParcel, warpFreightQuoteBody } from "./warp";

function carton(quantity: number, weightLbs: number): FreightPiece {
  return {
    lengthIn: 12,
    widthIn: 12,
    heightIn: 19.5,
    weightLbs,
    quantity,
    packaging: "box",
    dimensionLabel: "12\" W x 12\" L x 19.5\" H",
    weightLabel: `${weightLbs.toFixed(2)} lbs`,
  };
}

function freight(pieces: FreightPiece[], boxes: number): ShipmentFreight {
  const weightLbs = pieces.reduce((sum, piece) => sum + piece.weightLbs, 0);
  return {
    weightLbs,
    palletCount: 0,
    lengthIn: pieces[0]?.lengthIn ?? 0,
    widthIn: pieces[0]?.widthIn ?? 0,
    heightIn: pieces[0]?.heightIn ?? 0,
    rolls: boxes * 4,
    boxes,
    pieces,
  };
}

describe("Warp carton versus pallet payload", () => {
  it("uses a 16.5 in carton for 15 in film and rounded pallet-tier weights", () => {
    assert.equal(handBoxHeightIn(15), 16.5);
    assert.equal(handBoxHeightIn(18), 19.5);
    const cartons = warpHandPieces({ boxes: 2, widthInches: 15, boxWeightLbs: 18, palletWeightLbs: 1175.74 });
    assert.equal(cartons?.[0]?.heightIn, 16.5);
    assert.equal(cartons?.[0]?.packaging, "box");
    assert.equal(cartons?.[0]?.weightLbs, 36);
    const quarter = warpHandPieces({ boxes: 16, widthInches: 15, boxWeightLbs: 18, palletWeightLbs: 1175.74 });
    assert.equal(quarter?.[0]?.heightIn, 29.5);
    assert.equal(quarter?.[0]?.weightLbs, 294);
    const half = warpHandPieces({ boxes: 32, widthInches: 18, boxWeightLbs: 34.65, palletWeightLbs: 2240.2 });
    assert.equal(half?.[0]?.heightIn, 39);
    assert.equal(half?.[0]?.weightLbs, 1120);
    const full = warpHandPieces({ boxes: 64, widthInches: 18, boxWeightLbs: 34.65, palletWeightLbs: 2240.2 });
    assert.equal(full?.[0]?.heightIn, 78);
    assert.equal(full?.[0]?.weightLbs, 2240);
  });

  it("quotes fewer than 16 boxes as PARCEL cartons at 12 x 12 x 19.5 and 18 lb", () => {
    const shipment = freight([carton(1, 18)], 1);
    assert.equal(usesWarpParcel(shipment), true);
    const body = warpFreightQuoteBody({
      pickupDate: "2026-10-19",
      originZip: "78572",
      destinationZip: "75207",
      freight: shipment,
      shipmentType: "PARCEL",
    });
    assert.equal(body.shipmentType, "PARCEL");
    assert.equal("vehicleType" in body, false);
    const item = (body.listItems as Array<Record<string, unknown>>)[0];
    assert.equal(item?.packaging, "carton");
    assert.equal(item?.length, 12);
    assert.equal(item?.width, 12);
    assert.equal(item?.height, 19.5);
    assert.equal(item?.totalWeight, 18);
    assert.equal(item?.quantity, 1);
  });

  it("keeps 16 or more boxes on an LTL pallet payload", () => {
    const piece: FreightPiece = {
      ...carton(1, 293.94),
      lengthIn: 48,
      widthIn: 48,
      heightIn: 29.5,
      packaging: "pallet",
    };
    const shipment = freight([piece], 16);
    assert.equal(usesWarpParcel(shipment), false);
    const body = warpFreightQuoteBody({
      pickupDate: "2026-10-19",
      originZip: "78572",
      destinationZip: "75207",
      freight: shipment,
      shipmentType: "LTL",
      vehicleCode: "DRY_VAN_53_LTL",
    });
    assert.equal(body.shipmentType, "LTL");
    assert.deepEqual(body.vehicleType, { code: "DRY_VAN_53_LTL" });
    const item = (body.listItems as Array<Record<string, unknown>>)[0];
    assert.equal(item?.packaging, "pallet");
    assert.equal(item?.length, 48);
    assert.equal(item?.height, 29.5);
    assert.equal(item?.totalWeight, 293.94);
  });
});
