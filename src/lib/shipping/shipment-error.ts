export class ShipmentDataError extends Error {
  weightLbs = 0;
  rolls = 0;
  boxes = 0;

  constructor(
    readonly code: "missing_weight" | "missing_dims",
    message: string,
    totals?: { weightLbs?: number; rolls?: number; boxes?: number }
  ) {
    super(message);
    this.weightLbs = totals?.weightLbs ?? 0;
    this.rolls = totals?.rolls ?? 0;
    this.boxes = totals?.boxes ?? 0;
  }
}
