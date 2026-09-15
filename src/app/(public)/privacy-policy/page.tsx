import React from "react";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";

export const metadata = {
  title: "Privacy Policy | Plastipac USA",
  description:
    "Learn how Plastipac USA collects, uses, and protects personal information related to Stripe payments, contact forms, cookies, and account data.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" effectiveDate="September 15, 2026">
      <section className="space-y-3">
        <h2>1. Introduction</h2>
        <p>
          Plastipac USA (&quot;Plastipac,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and is
          committed to protecting personal information you share when browsing our website, requesting quotes,
          creating an account, or purchasing industrial stretch film and packaging products. This Privacy Policy
          explains what information we collect, how we use it, with whom we share it, and the choices available to you
          under applicable United States privacy laws.
        </p>
        <p>
          By using plastipacusa.com (the &quot;Site&quot;) or placing an order, you acknowledge the practices described
          in this Policy. If you do not agree, please do not use the Site or submit personal information.
        </p>
      </section>

      <section className="space-y-3">
        <h2>2. Information We Collect</h2>
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li>
            <strong>Account &amp; profile data:</strong> name, company name, email address, phone number, shipping and
            billing addresses, and password credentials.
          </li>
          <li>
            <strong>Order &amp; commercial data:</strong> products ordered, quantities, pricing tiers, purchase history,
            tax-exempt or reseller details you voluntarily provide, and related communications.
          </li>
          <li>
            <strong>Contact &amp; quote forms:</strong> information submitted through quote requests, support inquiries,
            or email to sales@plastipacusa.com.
          </li>
          <li>
            <strong>Payment-related identifiers:</strong> when you check out, payment card details are collected and
            processed by Stripe (see Section 4). We do not store full payment card numbers on our servers.
          </li>
        </ul>
        <h3>2.2 Information Collected Automatically</h3>
        <ul>
          <li>
            <strong>Device &amp; usage data:</strong> IP address, browser type, operating system, referring URLs, pages
            viewed, and timestamps.
          </li>
          <li>
            <strong>Cookies &amp; similar technologies:</strong> session cookies, preference cookies, and analytics or
            security cookies as described in Section 5.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>3. How We Use Your Information</h2>
        <p>We use personal information to:</p>
        <ul>
          <li>Process, fulfill, and support orders for industrial stretch film and packaging products;</li>
          <li>Create and manage customer accounts and authenticated sessions;</li>
          <li>Respond to quote requests, sales inquiries, and customer support;</li>
          <li>Process payments and prevent fraud in coordination with Stripe;</li>
          <li>Communicate order status, shipping updates, and service-related notices;</li>
          <li>Improve Site performance, security, and user experience;</li>
          <li>Comply with legal, tax, accounting, and regulatory obligations; and</li>
          <li>Send commercial communications where permitted by law (you may opt out of marketing emails).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>4. Stripe Payments &amp; Payment Processors</h2>
        <p>
          Online payments are processed by <strong>Stripe, Inc.</strong> (&quot;Stripe&quot;). When you submit payment
          information, it is transmitted directly to Stripe using industry-standard encryption. Stripe may collect
          payment card data, billing address, and fraud-prevention signals according to Stripe&apos;s own privacy policy
          available at{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
            stripe.com/privacy
          </a>
          .
        </p>
        <p>
          Plastipac receives limited payment metadata from Stripe (for example, payment status, last four digits of a
          card, card brand, and transaction identifiers) necessary to confirm orders, issue invoices or receipts, handle
          disputes, and maintain financial records. We do not sell payment card information.
        </p>
      </section>

      <section className="space-y-3">
        <h2>5. Cookies &amp; Tracking Technologies</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
          <li>Maintain secure login sessions and shopping cart state;</li>
          <li>Remember preferences and improve Site functionality;</li>
          <li>Measure traffic and diagnose technical issues; and</li>
          <li>Support payment security and fraud prevention.</li>
        </ul>
        <p>
          You can control cookies through your browser settings. Disabling certain cookies may affect Site features such
          as checkout, account login, or cart persistence. Where required, we will provide additional notice or consent
          mechanisms for non-essential cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2>6. How We Share Information</h2>
        <p>We may share personal information with:</p>
        <ul>
          <li>
            <strong>Service providers:</strong> payment processors (Stripe), hosting providers, email delivery tools,
            analytics vendors, and freight carriers needed to operate the Site and deliver orders;
          </li>
          <li>
            <strong>Business transfers:</strong> in connection with a merger, acquisition, financing, or sale of assets;
          </li>
          <li>
            <strong>Legal &amp; safety:</strong> when required by law, subpoena, or to protect the rights, property, or
            safety of Plastipac, our customers, or the public; and
          </li>
          <li>
            <strong>With your direction:</strong> when you ask us to share information with a third party.
          </li>
        </ul>
        <p>
          We do not sell personal information for monetary consideration. We do not share personal information for
          cross-context behavioral advertising as those terms are commonly defined under U.S. state privacy laws, except
          as disclosed and permitted.
        </p>
      </section>

      <section className="space-y-3">
        <h2>7. Data Retention</h2>
        <p>
          We retain personal information only as long as reasonably necessary for the purposes described in this Policy,
          including:
        </p>
        <ul>
          <li>
            <strong>Order &amp; transaction records:</strong> typically retained for at least seven (7) years to satisfy
            tax, accounting, warranty, and audit requirements;
          </li>
          <li>
            <strong>Account data:</strong> retained while your account remains active and for a reasonable period
            thereafter for security, dispute resolution, and legal compliance;
          </li>
          <li>
            <strong>Contact form submissions:</strong> retained for as long as needed to respond to your inquiry and for
            related business records; and
          </li>
          <li>
            <strong>Server &amp; security logs:</strong> retained for a limited period consistent with security and
            operational needs.
          </li>
        </ul>
        <p>
          When retention is no longer required, we will delete or de-identify information in accordance with our
          internal practices, subject to legal holds or legitimate business needs.
        </p>
      </section>

      <section className="space-y-3">
        <h2>8. Security</h2>
        <p>
          We implement administrative, technical, and organizational safeguards designed to protect personal information,
          including encrypted connections (HTTPS), access controls, and payment processing through PCI-DSS compliant
          providers such as Stripe. No method of transmission or storage is completely secure; we cannot guarantee
          absolute security.
        </p>
      </section>

      <section className="space-y-3">
        <h2>9. Your Privacy Rights (United States)</h2>
        <p>
          Depending on your state of residence (including, where applicable, California, Colorado, Connecticut,
          Virginia, and other U.S. jurisdictions with consumer privacy laws), you may have rights to:
        </p>
        <ul>
          <li>Request access to or a copy of personal information we hold about you;</li>
          <li>Request correction of inaccurate personal information;</li>
          <li>Request deletion of personal information, subject to legal exceptions;</li>
          <li>Opt out of certain processing or targeted advertising, where applicable; and</li>
          <li>Appeal a denial of a privacy request where state law provides that right.</li>
        </ul>
        <p>
          To exercise these rights, email{" "}
          <a href="mailto:sales@plastipacusa.com">sales@plastipacusa.com</a> with the subject line
          &quot;Privacy Request.&quot; We may verify your identity before fulfilling a request. Authorized agents may
          submit requests where permitted by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2>10. Children&apos;s Privacy</h2>
        <p>
          The Site is intended for business and industrial purchasers age 18 or older. We do not knowingly collect
          personal information from children under 13. If you believe a child has provided us information, contact us
          and we will take appropriate steps to delete it.
        </p>
      </section>

      <section className="space-y-3">
        <h2>11. International &amp; Cross-Border Customers</h2>
        <p>
          Plastipac primarily serves customers in the United States and Northern Mexico. If you access the Site from
          outside the United States, you understand that your information may be processed in the United States, where
          privacy laws may differ from those in your jurisdiction.
        </p>
      </section>

      <section className="space-y-3">
        <h2>12. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The &quot;Effective Date&quot; at the top of this page
          reflects the latest revision. Continued use of the Site after changes become effective constitutes acceptance
          of the updated Policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2>13. Contact Us</h2>
        <p>
          Plastipac USA
          <br />
          Email: <a href="mailto:sales@plastipacusa.com">sales@plastipacusa.com</a>
          <br />
          Phone: <a href="tel:+19564003683">(956) 400-3683</a> /{" "}
          <a href="tel:+19564006563">(956) 400-6563</a>
        </p>
        <p>
          Related policies:{" "}
          <Link href="/terms-of-service">Terms of Service</Link>,{" "}
          <Link href="/refund-policy">Refund Policy</Link>, and{" "}
          <Link href="/shipping-policy">Shipping Policy</Link>.
        </p>
      </section>
    </LegalPageShell>
  );
}
