import React from "react";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "Shipping & Freight Policy | Plastipac USA",
  description:
    "Plastipac USA Freight & Delivery Policy covering plant dispatch windows, delivery addresses, and carrier receiving procedures for industrial stretch film.",
};

export default function ShippingPolicyPage() {
  return (
    <LegalPageShell title="Freight & Delivery Policy" effectiveDate="September 15, 2026">
      <section className="space-y-3">
        <h2>1. Overview</h2>
        <p>
          This Freight &amp; Delivery Policy describes how Plastipac USA (&quot;Plastipac,&quot; &quot;we,&quot;
          &quot;us&quot;) dispatches, ships, and delivers industrial stretch film and packaging products. It
          supplements our <Link href="/terms-of-service">Terms of Service</Link> and{" "}
          <Link href="/refund-policy">Refund Policy</Link>. Shipping methods, carriers, and rates may vary by order size,
          destination, and whether goods ship as parcel, LTL, or full truckload.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Service Area</h2>
        <p>
          Plastipac primarily serves industrial customers throughout <strong>South Texas and Northern Mexico</strong>,
          and may ship to additional U.S. destinations where logistics and product availability allow. Cross-border
          shipments may require additional documentation, customs brokerage, duties, taxes, or importer-of-record
          arrangements. You are responsible for providing accurate consignee and customs information when applicable.
        </p>
      </section>

      <section className="space-y-3">
        <h2>3. Plant Dispatch Window (24–48 Hours)</h2>
        <p>
          In-stock orders are typically prepared for <strong>plant dispatch within twenty-four to forty-eight (24–48)
          hours</strong> after order confirmation and successful payment authorization (or approved commercial terms),
          excluding weekends, U.S. federal holidays, and plant closure days.
        </p>
        <ul>
          <li>
            &quot;Dispatch&quot; means the order has been picked, packed, and tendered to a carrier or made available for
            scheduled pickup—not that delivery has occurred.
          </li>
          <li>
            Large pallet, multi-SKU, or made-to-order shipments may require additional processing time; we will
            communicate revised estimates when reasonably possible.
          </li>
          <li>
            Inventory shortages, extreme weather, carrier capacity constraints, or force majeure events may delay
            dispatch. Plastipac is not liable for consequential damages arising from shipping delays.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>4. Delivery Estimates</h2>
        <p>
          Transit times after dispatch depend on carrier service level, destination, and freight mode. Any delivery dates
          shown at checkout, in quotes, or in confirmation emails are <strong>estimates only</strong> and are not
          guaranteed unless expressly stated in a signed written agreement. Tracking information will be provided when
          available from the carrier.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Delivery Addresses</h2>
        <ul>
          <li>
            You must provide a <strong>complete, accurate commercial delivery address</strong> capable of receiving the
            freight type ordered (parcel, palletized LTL, or truckload), including suite/dock identifiers, contact name,
            and phone number.
          </li>
          <li>
            Residential deliveries, limited-access locations, schools, military bases, or sites without a loading dock
            may incur additional carrier fees or may not be available for palletized freight.
          </li>
          <li>
            Address changes requested after dispatch may not be possible; if permitted by the carrier, change fees and
            reconsignment charges are your responsibility.
          </li>
          <li>
            Plastipac is not responsible for delays, returns, or lost freight caused by incorrect, incomplete, or
            inaccessible addresses provided at checkout.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>6. Shipping Rates &amp; Freight Charges</h2>
        <p>
          Freight may be calculated at checkout, quoted by our sales desk, or billed as &quot;prepay and add,&quot;
          collect, or third-party depending on the arrangement. Fuel surcharges, residential/limited-access fees, liftgate
          fees, inside delivery, appointment fees, and detention charges may apply and are generally the customer&apos;s
          responsibility unless otherwise agreed in writing.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Carrier Receiving Procedures</h2>
        <p>
          Proper receiving protects your claim rights. When freight arrives, your receiving personnel should:
        </p>
        <ol>
          <li>
            <strong>Verify the shipment</strong> against the packing list / Bill of Lading (BOL) for piece count, pallet
            count, and product description before the driver leaves.
          </li>
          <li>
            <strong>Inspect for visible damage</strong> to cartons, stretch wrap, cores, and pallet integrity.
          </li>
          <li>
            <strong>Note exceptions on the delivery receipt / BOL</strong> before signing—describe shortages or damage
            specifically. Do not sign clear if damage or shortage is apparent.
          </li>
          <li>
            <strong>Refuse severely damaged freight</strong> when appropriate, or accept with detailed notation, then
            photograph the condition and contact Plastipac promptly.
          </li>
          <li>
            <strong>Retain all packaging and documentation</strong> until any claim is resolved.
          </li>
        </ol>
        <p>
          Report damaged or missing goods to Plastipac within <strong>forty-eight (48) hours</strong> of delivery (or
          sooner if required by the carrier) as described in our{" "}
          <Link href="/refund-policy">Refund Policy</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Customer Pickup</h2>
        <p>
          Where offered, will-call or customer pickup must be scheduled with our plant or warehouse team. Photo ID and
          order confirmation may be required. Risk of loss transfers upon tender to your driver or representative.
          Loading assistance, if any, is provided subject to facility rules and is not a guarantee of equipment or labor
          availability.
        </p>
      </section>

      <section className="space-y-3">
        <h2>9. Risk of Loss &amp; Title</h2>
        <p>
          Unless otherwise stated on your order confirmation or commercial invoice, risk of loss passes to you when the
          shipment is tendered to the carrier (or upon customer pickup). Title passes according to the same shipping
          terms unless a written agreement provides otherwise.
        </p>
      </section>

      <section className="space-y-3">
        <h2>10. Undeliverable &amp; Refused Shipments</h2>
        <p>
          If a shipment is refused, returned as undeliverable, or cannot be delivered due to recipient unavailability
          after reasonable carrier attempts, you may be responsible for return freight, re-delivery fees, and restocking
          charges consistent with our Refund Policy. Contact us immediately if you anticipate a receiving issue.
        </p>
      </section>

      <section className="space-y-3">
        <h2>11. Force Majeure</h2>
        <p>
          Plastipac is not liable for failure or delay in dispatch or delivery caused by events beyond our reasonable
          control, including natural disasters, severe weather, labor disputes, carrier failures, customs delays,
          pandemics, government actions, supply interruptions, or utility outages.
        </p>
      </section>

      <section className="space-y-3">
        <h2>12. Contact — Shipping &amp; Logistics</h2>
        <p>
          For dispatch status, freight quotes, or delivery exceptions:
          <br />
          Email: <a href="mailto:contact@plastipacusa.com">contact@plastipacusa.com</a>
          <br />
          Phone: <a href="tel:+19564003683">(956) 400-3683</a> /{" "}
          <a href="tel:+19564006563">(956) 400-6563</a>
        </p>
      </section>
    </LegalPageShell>
  );
}
