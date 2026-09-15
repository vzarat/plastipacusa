import React from "react";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "Terms of Service | Plastipac USA",
  description:
    "Terms of Service for Plastipac USA covering order acceptance, pricing, intellectual property, and limitation of liability for industrial stretch film products.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" effectiveDate="September 15, 2026">
      <section className="space-y-3">
        <h2>1. Agreement to Terms</h2>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Plastipac USA website
          (plastipacusa.com), online storefront, accounts, and purchases of industrial cast stretch film and related
          packaging products (collectively, the &quot;Services&quot;). By accessing the Site, creating an account, or
          placing an order, you agree to be bound by these Terms and our{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>,{" "}
          <Link href="/refund-policy">Refund Policy</Link>, and{" "}
          <Link href="/shipping-policy">Shipping Policy</Link>.
        </p>
        <p>
          If you are purchasing on behalf of a company, you represent that you have authority to bind that entity. These
          Terms form a legally binding agreement between you (or your company) and Plastipac USA (&quot;Plastipac,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Eligibility &amp; Business Use</h2>
        <p>
          Our products are industrial packaging materials intended for commercial, warehouse, logistics, and
          manufacturing use. You must be at least 18 years of age and capable of entering into a binding contract under
          applicable law. Consumer retail use is permitted only to the extent offered on the Site, but all purchasers
          acknowledge the industrial nature of stretch film products and the handling requirements described herein.
        </p>
      </section>

      <section className="space-y-3">
        <h2>3. Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activity under
          your account. Provide accurate, complete information and promptly update it. We may suspend or terminate
          accounts that appear fraudulent, abusive, or in violation of these Terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2>4. Products, Specifications &amp; Industrial Nature</h2>
        <p>
          Plastipac manufactures and sells high-performance cast stretch films and packaging containment solutions.
          Product descriptions, gauges, dimensions, roll lengths, holding-force characteristics, and application guidance
          are provided for informational purposes and may be updated without notice. Actual performance depends on wrap
          technique, equipment settings, load profile, environmental conditions, and storage. You are solely responsible
          for selecting appropriate film for your application and for safe handling, storage, and use in accordance with
          industry practices.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Orders &amp; Acceptance</h2>
        <p>
          Submitting an order (including through Stripe checkout) constitutes an offer to purchase. <strong>Order
          acceptance is at Plastipac&apos;s sole discretion.</strong> We may accept, reject, cancel, or limit any order
          for any reason, including suspected fraud, pricing or inventory errors, credit or payment issues, shipping
          restrictions, or product unavailability.
        </p>
        <p>
          A contract is formed only when we confirm acceptance (for example, by order confirmation email, payment capture
          confirmation, or shipment notice). If we cancel an accepted order after payment, we will issue a refund of
          amounts paid for the cancelled portion in accordance with our Refund Policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. Pricing, Taxes &amp; Pricing Errors</h2>
        <p>
          Prices displayed on the Site are in U.S. dollars unless otherwise stated and may exclude applicable sales tax,
          freight, duties, or handling charges, which will be calculated where required at checkout or on the invoice.
          Volume, pallet, and package-tier pricing may change without prior notice.
        </p>
        <p>
          <strong>Pricing errors:</strong> Despite our efforts, items may occasionally be listed at an incorrect price
          due to typographical error, system glitch, or outdated catalog data. We reserve the right to cancel or refuse
          any order placed for a product listed at an incorrect price, whether or not the order has been confirmed and
          whether or not payment has been charged. If payment has already been charged, we will refund the incorrect
          amount charged for the cancelled order or item.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Payment</h2>
        <p>
          Online payments are processed by Stripe. By providing a payment method, you represent that you are authorized
          to use it and authorize Plastipac (via Stripe) to charge the full amount of your order, including taxes and
          shipping where applicable. We may place a temporary authorization on your payment method. Failed, disputed, or
          reversed payments may result in order suspension or cancellation.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Shipping &amp; Delivery</h2>
        <p>
          Shipping, dispatch windows, delivery addresses, and carrier receiving procedures are governed by our{" "}
          <Link href="/shipping-policy">Shipping Policy</Link>, which is incorporated into these Terms by reference. Risk
          of loss transfers according to the shipping terms stated on your confirmation or invoice (commonly upon
          carrier pickup or delivery, depending on the freight arrangement).
        </p>
      </section>

      <section className="space-y-3">
        <h2>9. Returns, Refunds &amp; Cancellations</h2>
        <p>
          Returns, damaged-goods claims, restocking fees, and cancellations are governed by our{" "}
          <Link href="/refund-policy">Refund Policy</Link>, incorporated herein by reference. Unauthorized returns may be
          refused.
        </p>
      </section>

      <section className="space-y-3">
        <h2>10. Intellectual Property</h2>
        <p>
          All content on the Site—including trademarks, logos, product names (including FORCE and related brand marks),
          text, graphics, images, layout, software, and product photography—is owned by Plastipac or its licensors and is
          protected by United States and international intellectual property laws. You may not copy, modify, distribute,
          scrape, reverse engineer, or create derivative works from Site content or our product designs without prior
          written permission, except for limited personal or internal business use of publicly available product
          information for evaluating a purchase.
        </p>
        <p>
          &quot;Plastipac USA,&quot; associated logos, and product line names are trademarks of Plastipac. Unauthorized
          use is prohibited.
        </p>
      </section>

      <section className="space-y-3">
        <h2>11. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Site for unlawful, fraudulent, or abusive purposes;</li>
          <li>Interfere with Site security, payment processing, or other users&apos; access;</li>
          <li>Upload malware or attempt unauthorized access to systems or data;</li>
          <li>Misrepresent your identity, affiliation, or authority to purchase; or</li>
          <li>Resell Site content or use automated bots in a manner that overloads or scrapes the Site without consent.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>12. Disclaimer of Warranties</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SITE AND PRODUCTS ARE PROVIDED &quot;AS IS&quot; AND &quot;AS
          AVAILABLE.&quot; EXCEPT FOR ANY EXPRESS WRITTEN WARRANTY WE PROVIDE IN A SEPARATE AGREEMENT OR ON A PRODUCT
          LABEL/SPEC SHEET, PLASTIPAC DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
        </p>
        <p>
          Without limiting the foregoing, Plastipac does not warrant that stretch film will prevent all load failures,
          tear-outs, moisture intrusion, or transit damage under every wrapping method or environmental condition.
        </p>
      </section>

      <section className="space-y-3">
        <h2>13. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, PLASTIPAC AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS,
          AND SUPPLIERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
          DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, BUSINESS OPPORTUNITY, OR GOODWILL, ARISING OUT OF OR RELATED
          TO YOUR USE OF THE SITE, PRODUCTS, OR SERVICES—INCLUDING INDUSTRIAL STRETCH FILM PERFORMANCE, LOAD
          CONTAINMENT FAILURES, OR FREIGHT DELAYS—WHETHER BASED IN CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT
          LIABILITY, OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, PLASTIPAC&apos;S TOTAL AGGREGATE LIABILITY FOR ANY CLAIM ARISING OUT OF
          OR RELATING TO THESE TERMS OR ANY ORDER SHALL NOT EXCEED THE AMOUNT YOU PAID TO PLASTIPAC FOR THE SPECIFIC
          PRODUCT(S) GIVING RISE TO THE CLAIM DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations; in those jurisdictions, our liability is limited to the
          fullest extent permitted by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2>14. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Plastipac and its affiliates, officers, employees, and agents
          from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable
          attorneys&apos; fees) arising out of or related to your misuse of products, violation of these Terms, or
          infringement of third-party rights.
        </p>
      </section>

      <section className="space-y-3">
        <h2>15. Governing Law &amp; Dispute Resolution</h2>
        <p>
          These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law principles.
          Exclusive venue for disputes shall lie in the state or federal courts located in Texas, unless applicable law
          requires otherwise. You consent to personal jurisdiction in those courts. Either party may seek injunctive
          relief in any court of competent jurisdiction to protect intellectual property or confidential information.
        </p>
      </section>

      <section className="space-y-3">
        <h2>16. Changes to Terms</h2>
        <p>
          We may revise these Terms at any time by posting an updated version on the Site. The Effective Date indicates
          the latest revision. Continued use of the Services after changes constitutes acceptance of the updated Terms.
          Material changes may also be communicated by email or Site notice when appropriate.
        </p>
      </section>

      <section className="space-y-3">
        <h2>17. Severability &amp; Entire Agreement</h2>
        <p>
          If any provision of these Terms is found unenforceable, the remaining provisions remain in full force. These
          Terms, together with the Privacy Policy, Refund Policy, Shipping Policy, and any order confirmation or written
          commercial agreement, constitute the entire agreement between you and Plastipac regarding the Services and
          supersede prior conflicting understandings, except where a signed written contract expressly controls.
        </p>
      </section>

      <section className="space-y-3">
        <h2>18. Contact</h2>
        <p>
          Plastipac USA ·{" "}
          <a href="mailto:sales@plastipacusa.com">sales@plastipacusa.com</a> ·{" "}
          <a href="tel:+19564003683">(956) 400-3683</a> /{" "}
          <a href="tel:+19564006563">(956) 400-6563</a>
        </p>
      </section>
    </LegalPageShell>
  );
}
