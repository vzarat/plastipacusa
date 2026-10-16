export const PRICE_DIFFERENCE_NOTES = [
  "Pickup date: both quotes must use the same YYYY-MM-DD from nextBusinessPickupDate.",
  "Rounding: Warp is sent Math.ceil of each piece weight, not the decimal shown in the order summary.",
  "Dimensions: each tier uses only the inches stored for that tier.",
  "Accessorials: liftgate, residential, or appointment changes the carrier price.",
  "Live vs cached: a cached Warp spread has no bookable quote id and is not offered.",
  "Time of query: carrier prices move between the moment Warp's tool ran and this request.",
] as const;
