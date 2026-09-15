import React from "react";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "Refund & Cancellation Policy | Plastipac USA",
  description:
    "Plastipac USA Refund & Cancellation Policy covering damaged goods inspection, 30-day returns, restocking fees, and freight claims for industrial stretch film.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPageShell title="Refund & Cancellation Policy" effectiveDate="September 15, 2026">
      <section className="space-y-3">
        <h2>1. Overview</h2>
        <p>
          This Refund &amp; Cancellation Policy explains how Plastipac USA (&quot;Plastipac,&quot; &quot;we,&quot;
          &quot;us&quot;) handles order cancellations, returns, exchanges, damaged-goods claims, restocking fees, and
          freight-related claims for industrial stretch film and packaging products purchased through our website or
          sales desk. This Policy forms part of our{" "}
          <Link href="/terms-of-service">Terms of Service</Link> and should be read with our{" "}
          <Link href="/shipping-policy">Shipping Policy</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Order Cancellations</h2>
        <ul>
          <li>
            <strong>Before dispatch:</strong> You may request cancellation by emailing{" "}
            <a href="mailto:sales@plastipacusa.com">sales@plastipacusa.com</a> or calling{" "}
            <a href="tel:+19564003683">(956) 400-3683</a> as soon as possible. If the order has not entered plant
            picking, packing, or carrier tender, we will typically cancel and refund amounts paid for the cancelled
            items.
          </li>
          <li>
            <strong>After dispatch:</strong> Once product has shipped or been tendered to a carrier, the order generally
            cannot be cancelled. You may still pursue a return under Section 4 if eligible, subject to freight and
            restocking charges.
          </li>
          <li>
            <strong>Plastipac-initiated cancellations:</strong> We may cancel orders due to inventory shortages, pricing
            errors, payment failure, suspected fraud, or shipping restrictions. Eligible prepaid amounts will be
            refunded.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>3. Damaged Goods — Inspection at Delivery</h2>
        <p>
          Stretch film rolls, cases, and pallets can be damaged in transit. <strong>You must inspect shipments upon
          delivery</strong> before signing the carrier delivery receipt:
        </p>
        <ol>
          <li>Check for torn film, crushed cores, wet cartons, broken stretch wrap on the pallet, missing units, or
            visible impact damage.</li>
          <li>
            If damage or shortage is visible, <strong>note it clearly on the carrier delivery receipt / Bill of
            Lading</strong> before signing (e.g., &quot;crushed corner – 2 cases damaged&quot;). Signing &quot;clear&quot;
            or refusing to note visible damage may limit or bar freight and damage claims.
          </li>
          <li>
            Photograph the damaged packaging, labels, and product before moving freight whenever reasonably possible.
          </li>
          <li>
            Notify Plastipac within <strong>forty-eight (48) hours</strong> of delivery at{" "}
            <a href="mailto:sales@plastipacusa.com">sales@plastipacusa.com</a> with your order number, photos, and a
            copy of the notated delivery receipt.
          </li>
        </ol>
        <p>
          Concealed damage discovered after delivery must be reported as soon as practicable and no later than five (5)
          business days after delivery, subject to carrier claim deadlines.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. 30-Day Return Window</h2>
        <p>
          Eligible unused products may be returned within <strong>thirty (30) days</strong> of the delivery date, subject
          to the conditions below:
        </p>
        <ul>
          <li>Product must be unused, in original packaging, and in resalable condition;</li>
          <li>Cores, cartons, and labels must be intact and free of warehouse damage caused after delivery;</li>
          <li>A Return Merchandise Authorization (RMA) must be obtained from Plastipac before shipping any return;</li>
          <li>Custom, specially cut, private-label, or non-stock special-order items are generally non-returnable unless
            defective or shipped in error; and</li>
          <li>Opened or partially used rolls are not eligible for standard returns (defect claims are addressed in
            Section 6).</li>
        </ul>
        <p>
          To start a return, email <a href="mailto:sales@plastipacusa.com">sales@plastipacusa.com</a> with your order
          number, SKU(s), quantity, and reason. Unauthorized returns may be refused and returned to you at your expense.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Restocking Fees &amp; Return Freight</h2>
        <ul>
          <li>
            Approved returns of non-defective, correctly shipped products may be subject to a{" "}
            <strong>restocking fee of up to twenty percent (20%)</strong> of the product purchase price, depending on
            product type, packaging condition, and handling required to return goods to inventory.
          </li>
          <li>
            Unless Plastipac shipped the wrong item or the product is confirmed defective, <strong>customer is
            responsible for return freight</strong> and must use a carrier and packaging method approved in the RMA
            instructions.
          </li>
          <li>
            Original outbound freight charges are generally non-refundable once the shipment has left our plant, except
            where required by law or where Plastipac is solely at fault for an erroneous shipment.
          </li>
          <li>
            Refunds (less applicable restocking and non-refundable freight) are issued to the original payment method
            after we receive and inspect returned goods, typically within ten (10) business days of completed inspection.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>6. Defective Product Claims</h2>
        <p>
          If you believe stretch film or packaging product is manufacturing-defective, contact us promptly with lot/roll
          identifiers (if available), photos or video, and a description of the issue and wrapping conditions. Plastipac
          may request samples for laboratory or quality review. Remedies for confirmed defects may include replacement,
          store credit, or refund of the purchase price of the affected product, at our reasonable discretion, and
          constitute your exclusive remedy to the fullest extent permitted by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Freight Claims</h2>
        <p>
          Title and risk of loss transfer according to the shipping terms on your confirmation or invoice. For
          carrier-caused loss or damage:
        </p>
        <ul>
          <li>Preserve all packaging and freight documentation until the claim is resolved;</li>
          <li>Provide Plastipac with photos, delivery receipt notations, and claim details within the timelines in
            Section 3;</li>
          <li>
            Plastipac will reasonably assist with carrier freight claims where we arranged transportation; claim
            outcomes remain subject to carrier tariffs and rules; and
          </li>
          <li>
            If you arranged your own pickup or third-party freight, you (or your carrier) are generally responsible for
            filing and pursuing the freight claim.
          </li>
        </ul>
        <p>
          Failure to note visible damage at delivery or to report claims within required windows may result in denial of
          freight or product claims.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Wrong Item or Quantity</h2>
        <p>
          If we ship an incorrect SKU or quantity, notify us within five (5) business days of delivery. We will arrange
          correction by replacement shipment, pickup/return of the erroneous goods, and/or refund/credit as appropriate.
          Do not discard incorrect shipments without written authorization.
        </p>
      </section>

      <section className="space-y-3">
        <h2>9. How Refunds Are Issued</h2>
        <p>
          Approved refunds are processed through the original payment method (e.g., Stripe). Timing for funds to appear
          depends on your bank or card issuer and may take several business days after we initiate the refund. Order
          status updates will be communicated by email when available.
        </p>
      </section>

      <section className="space-y-3">
        <h2>10. Exceptions &amp; Non-Returnable Situations</h2>
        <ul>
          <li>Products damaged due to improper storage, handling, or wrapping after delivery;</li>
          <li>Products altered, relabeled, or used in a manner inconsistent with intended industrial use;</li>
          <li>Returns initiated after the 30-day window without an approved exception; and</li>
          <li>Orders cancelled after carrier tender where return freight and restocking would apply if goods come back.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>11. Contact for Returns &amp; Claims</h2>
        <p>
          Plastipac USA Returns &amp; Claims
          <br />
          Email: <a href="mailto:sales@plastipacusa.com">sales@plastipacusa.com</a>
          <br />
          Phone: <a href="tel:+19564003683">(956) 400-3683</a> /{" "}
          <a href="tel:+19564006563">(956) 400-6563</a>
        </p>
        <p>
          Include your order number, company name, and supporting photos or documents to help us resolve your request
          quickly.
        </p>
      </section>
    </LegalPageShell>
  );
}
