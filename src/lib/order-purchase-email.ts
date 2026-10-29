import { customerLineDescription } from "@/lib/catalog-sku";
import type {
  OrderConfirmationLineItem,
  OrderShipmentPiece,
  OrderShippingSelection,
} from "@/lib/order-confirmation-email";
import { carrierLogoUrl } from "@/lib/shipping/carrier-logo";

export interface PurchaseEmailDetails {
  lineItems: OrderConfirmationLineItem[];
  subtotalUsd?: number;
  discountUsd?: number;
  shippingUsd?: number;
  taxUsd?: number;
  shippingSelection?: OrderShippingSelection;
  detailsText: string;
}

function record(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(...values: unknown[]): string {
  for (const value of values) {
    const next = String(value ?? "").trim();
    if (next) return next;
  }
  return "";
}

function amount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function count(value: unknown): number {
  const number = Math.floor(Number(value) || 0);
  return number > 0 ? number : 0;
}

export function filmSpecLabel(item: Record<string, unknown>): string {
  const width = Number(item.widthInches ?? item.width_inches);
  const gauge = Number(item.gauge);
  const length = Number(item.lengthFeet ?? item.length_feet);
  const parts: string[] = [];
  if (width > 0 && gauge > 0 && length > 0) {
    parts.push(`${width}" × ${gauge} Ga × ${length} ft`);
  } else if (width > 0 && gauge > 0) {
    parts.push(`${width}" × ${gauge} Ga`);
  }
  const boxes = count(item.boxes ?? item.totalBoxes);
  const rolls = count(item.rolls ?? item.totalRolls);
  if (boxes > 0) parts.push(`${boxes} ${boxes === 1 ? "box" : "boxes"}`);
  if (rolls > 0) parts.push(`${rolls} ${rolls === 1 ? "roll" : "rolls"}`);
  const weight = amount(item.weightLbs ?? item.weight_lbs);
  if (weight != null && weight > 0) parts.push(`${weight} lb`);
  return parts.join(" · ");
}

function lineFromItem(item: Record<string, unknown>): OrderConfirmationLineItem {
  const quantity = Math.max(1, count(item.quantity) || 1);
  const unitPrice = amount(item.unitPrice ?? item.unit_price);
  const storedTotal = amount(item.totalPrice ?? item.total_price ?? item.total ?? item.linePrice);
  const total = storedTotal != null ? storedTotal : unitPrice != null ? Math.round(unitPrice * quantity * 100) / 100 : undefined;
  const detail = filmSpecLabel(item);
  return {
    description: customerLineDescription({
      productName: text(item.productName, item.product_name, item.name),
      sku: text(item.sku),
    }),
    sku: text(item.sku) || undefined,
    quantity,
    unitPrice: unitPrice ?? undefined,
    total,
    detail: detail || undefined,
  };
}

function piecesFrom(value: unknown): OrderShipmentPiece[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const piece = record(entry);
    if (!piece) return [];
    const dimensions = text(piece.dimensions, piece.dimensionLabel);
    const weight = text(piece.weight, piece.weightLabel);
    if (!dimensions && !weight) return [];
    return [
      {
        dimensions,
        weight,
        quantity: Math.max(1, count(piece.quantity) || 1),
        packaging: text(piece.packaging) || "package",
      },
    ];
  });
}

export function purchaseEmailFromOrder(order: Record<string, unknown>): PurchaseEmailDetails {
  const address = record(order.shipping_address);
  const items = Array.isArray(order.items) ? order.items.flatMap((item) => {
    const row = record(item);
    return row ? [lineFromItem(row)] : [];
  }) : [];
  const subtotalUsd = amount(order.subtotal) ?? undefined;
  const discountUsd = amount(order.discount_amount ?? order.discount) ?? undefined;
  const shippingUsd =
    amount(order.shipping ?? order.shipping_cost ?? address?.shipping_price) ?? undefined;
  const taxUsd = amount(order.tax ?? order.tax_amount) ?? undefined;
  const carrierName = text(address?.carrier_name, order.shipping_method, address?.shipping_method);
  const carrierKey = text(address?.carrier_key, order.shipping_provider);
  const serviceName = text(order.shipping_service, address?.shipping_service, carrierName);
  const transitDays = count(order.shipping_transit_days ?? address?.shipping_transit_days);
  const pieces = piecesFrom(address?.shipment_pieces);
  const weightLbs = amount(address?.shipment_weight_lbs) ?? undefined;
  const shippingSelection =
    carrierName || pieces.length || shippingUsd != null
      ? {
          carrierName: carrierName || serviceName || "Shipping",
          carrierKey: carrierKey || undefined,
          logoUrl: carrierName ? carrierLogoUrl(carrierKey, carrierName) : undefined,
          serviceName: serviceName || undefined,
          transitDays: transitDays || undefined,
          price: shippingUsd ?? 0,
          weightLbs,
          pieces,
        }
      : undefined;

  const money = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  const detailsText = [
    items.length
      ? [
          "Products:",
          ...items.map((item) => {
            const line = item.total != null ? ` — ${money(item.total)}` : "";
            const spec = item.detail ? `\n  ${item.detail}` : "";
            return `- ${item.description} × ${item.quantity}${line}${spec}`;
          }),
        ].join("\n")
      : null,
    shippingSelection
      ? [
          "Shipping:",
          shippingSelection.carrierName,
          shippingSelection.serviceName && shippingSelection.serviceName !== shippingSelection.carrierName
            ? shippingSelection.serviceName
            : null,
          shippingSelection.transitDays ? `${shippingSelection.transitDays} business days` : null,
          `Shipping price: ${money(shippingSelection.price)}`,
          shippingSelection.weightLbs ? `Shipment weight: ${shippingSelection.weightLbs} lb` : null,
          ...shippingSelection.pieces.map(
            (piece) =>
              `${piece.quantity} × ${piece.packaging}: ${[piece.dimensions, piece.weight].filter(Boolean).join(" · ")}`
          ),
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    subtotalUsd != null ? `Subtotal: ${money(subtotalUsd)}` : null,
    discountUsd && discountUsd > 0 ? `Discount: -${money(discountUsd)}` : null,
    shippingUsd != null ? `Shipping: ${money(shippingUsd)}` : null,
    taxUsd && taxUsd > 0 ? `Tax: ${money(taxUsd)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    lineItems: items,
    subtotalUsd,
    discountUsd,
    shippingUsd,
    taxUsd,
    shippingSelection,
    detailsText,
  };
}
