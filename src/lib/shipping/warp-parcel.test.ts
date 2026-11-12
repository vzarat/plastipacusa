import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FreightPiece, ShipmentFreight } from "./types";
import { handBoxHeightIn, warpHandPieces } from "./hand-freight";
import { SHIP_FROM_LOCATION } from "@/lib/shipping-method";
import { usesWarpParcel, warpFreightQuoteBody } from "./warp";

function carton(quantity: number, weightLbs: number): FreightPiece {
  return {
    lengthIn: 11,
    widthIn: 11,
    heightIn: 19.5,
    weightLbs,
    quantity,
    packaging: "box",
    dimensionLabel: "11\" W x 11\" L x 19.5\" H",
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
  it("adds one wooden pallet to the 48-box full pallet tier", () => {
    assert.equal(handBoxHeightIn(15), 19.5);
    assert.equal(handBoxHeightIn(18), 19.5);
    const cartons = warpHandPieces({ boxes: 2, widthInches: 15, boxWeightLbs: 18, palletWeightLbs: 1175.74 });
    assert.equal(cartons?.[0]?.heightIn, 19.5);
    assert.equal(cartons?.[0]?.packaging, "box");
    assert.equal(cartons?.[0]?.weightLbs, 36);
    const mid = warpHandPieces({ boxes: 16, widthInches: 15, boxWeightLbs: 18, palletWeightLbs: 1175.74 });
    assert.equal(mid?.[0]?.packaging, "box");
    assert.equal(mid?.[0]?.weightLbs, 288);
    const full = warpHandPieces({
      boxes: 48,
      widthInches: 18,
      palletDimensions: "48 x 48 x 78",
      boxWeightLbs: 35.63,
      palletWeightLbs: 1750.24,
    });
    assert.equal(full?.[0]?.heightIn, 78);
    assert.equal(full?.[0]?.widthIn, 48);
    assert.equal(full?.[0]?.packaging, "pallet");
    assert.equal(full?.[0]?.weightLbs, 1750.24);
    const fel = (boxes: number) =>
      warpHandPieces({
        boxes,
        widthInches: 15,
        palletDimensions: "48 x 40 x 68",
        boxWeightLbs: 22.67,
        palletWeightLbs: 1128.16,
      });
    assert.equal(fel(1)?.[0]?.weightLbs, 22.67);
    assert.equal(fel(1)?.[0]?.packaging, "box");
    assert.equal(fel(16)?.[0]?.packaging, "box");
    assert.equal(fel(48)?.[0]?.weightLbs, 1128.16);
    assert.equal(fel(48)?.[0]?.packaging, "pallet");
    assert.equal(fel(48)?.[0]?.heightIn, 68);
    assert.equal(fel(48)?.[0]?.widthIn, 40);
    assert.equal(fel(48)?.[0]?.lengthIn, 48);
  });

  it("quotes fewer than 48 boxes as PARCEL cartons at 11 x 11 x 19.5 and 18 lb", () => {
    const shipment = freight([carton(1, 18)], 1);
    assert.equal(usesWarpParcel(shipment), true);
    const body = warpFreightQuoteBody({
      pickupDate: "2026-10-19",
      destinationZip: "75207",
      destination: { street: "100 Main St", city: "Dallas", state: "TX" },
      freight: shipment,
      shipmentType: "PARCEL",
    });
    const pickup = body.pickupInfo as {
      zipcode: string;
      address: { street: string; city: string; state: string; zipcode: string; country: string };
    };
    const delivery = body.deliveryInfo as {
      zipcode: string;
      address: { street: string; city: string; state: string; zipcode: string; country: string };
    };
    assert.equal(pickup.zipcode, "78503");
    assert.equal(pickup.address.street, "5801 George McVay Dr");
    assert.equal(pickup.address.city, "McAllen");
    assert.equal(pickup.address.state, "TX");
    assert.equal(pickup.address.country, "US");
    assert.equal(delivery.zipcode, "75207");
    assert.equal(delivery.address.street, "100 Main St");
    assert.equal(delivery.address.city, "Dallas");
    assert.equal(SHIP_FROM_LOCATION, "McAllen, TX");
    assert.equal(SHIP_FROM_LOCATION.includes("George McVay"), false);
    assert.equal(body.shipmentType, "PARCEL");
    assert.equal("vehicleType" in body, false);
    const item = (body.listItems as Array<Record<string, unknown>>)[0];
    assert.equal(item?.packaging, "carton");
    assert.equal(item?.length, 11);
    assert.equal(item?.width, 11);
    assert.equal(item?.height, 19.5);
    assert.equal(item?.totalWeight, 18);
    assert.equal(item?.weightUnit, "lbs");
    assert.equal(item?.sizeUnit, "IN");
    assert.equal(item?.quantity, 1);
  });

  it("keeps Manual full pallets on LTL with inches + whole pounds for density", () => {
    const piece: FreightPiece = {
      lengthIn: 48,
      widthIn: 40,
      heightIn: 68,
      weightLbs: 1128.16,
      quantity: 1,
      packaging: "pallet",
      dimensionLabel: '40" W x 48" L x 68" H',
      weightLabel: "1128.16 lbs",
    };
    const shipment = freight([piece], 48);
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
    assert.equal(item?.width, 40);
    assert.equal(item?.height, 68);
    assert.equal(item?.sizeUnit, "IN");
    assert.equal(item?.weightUnit, "lbs");
    assert.equal(item?.totalWeight, 1129);
  });
});
