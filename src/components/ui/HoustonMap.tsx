"use client";

import React from "react";
import { Map, Marker, Overlay } from "pigeon-maps";

const HOUSTON: [number, number] = [29.7604, -95.3698];

function cartoDark(x: number, y: number, z: number) {
  return `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`;
}

export function HoustonMap() {
  return (
    <Map
      center={HOUSTON}
      zoom={10}
      provider={cartoDark}
      metaWheelZoom
      attribution={
        <span>
          {" © "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">
            OpenStreetMap
          </a>
          {" © "}
          <a href="https://carto.com/attributions" target="_blank" rel="noreferrer noopener">
            CARTO
          </a>
        </span>
      }
    >
      <Marker anchor={HOUSTON} color="#0284c7" width={36} />
      <Overlay anchor={HOUSTON}>
        <div
          className="pointer-events-none whitespace-nowrap rounded-full border border-sky-400/40 bg-slate-950/90 px-2.5 py-1 text-[11px] font-semibold text-sky-100 shadow-lg"
          style={{ transform: "translate(-50%, -150%)" }}
        >
          Houston Delivery Hub · Fridays Only
        </div>
      </Overlay>
    </Map>
  );
}
