import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

export interface AdminOrderNotificationEmailItem {
  quantity: number;
  productName: string;
  linePrice: number;
}

interface AdminOrderNotificationEmailProps {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  orderDate: string;
  totalAmount: number;
  items: AdminOrderNotificationEmailItem[];
  shippingAddress?: {
    full_name?: string | null;
    email?: string | null;
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  };
  adminDashboardUrl?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));

export function AdminOrderNotificationEmail({
  orderId,
  customerName,
  customerEmail,
  customerCompany,
  orderDate,
  totalAmount,
  items,
  shippingAddress,
  adminDashboardUrl = "https://plastipacusa.com/admin",
}: AdminOrderNotificationEmailProps) {
  const shippingLines = [
    shippingAddress?.line1,
    shippingAddress?.line2,
    [shippingAddress?.city, shippingAddress?.state, shippingAddress?.postal_code]
      .filter(Boolean)
      .join(", "),
    shippingAddress?.country,
  ].filter(Boolean);

  return (
    <Html>
      <Head />
      <Preview>New order received for Plastipac USA.</Preview>
      <Tailwind>
        <Body style={{ margin: 0, backgroundColor: "#f8fafc", fontFamily: "Arial, sans-serif" }}>
          <Container
            style={{
              maxWidth: 680,
              margin: "40px auto",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: "32px",
            }}
          >
            <Section>
              <Text style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: "#2563eb", textTransform: "uppercase" }}>
                Plastipac USA Admin
              </Text>
              <Heading style={{ fontSize: 30, margin: "0 0 12px", color: "#0f172a" }}>
                New Order Received
              </Heading>
              <Text style={{ fontSize: 16, lineHeight: 1.6, color: "#334155", margin: "0 0 24px" }}>
                A new customer order has been submitted and requires attention.
              </Text>
            </Section>

            <Section
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "20px",
                marginBottom: 24,
              }}
            >
              <Text style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>
                Order ID: <strong style={{ color: "#0f172a" }}>{orderId}</strong>
              </Text>
              <Text style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>
                Customer: <strong style={{ color: "#0f172a" }}>{customerName}</strong>
              </Text>
              <Text style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>
                Email: <strong style={{ color: "#0f172a" }}>{customerEmail}</strong>
              </Text>
              <Text style={{ margin: "0 0 10px", fontSize: 13, color: "#64748b" }}>
                Company: <strong style={{ color: "#0f172a" }}>{customerCompany}</strong>
              </Text>
              <Text style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                Order Date: <strong style={{ color: "#0f172a" }}>{formatDate(orderDate)}</strong>
              </Text>
            </Section>

            <Section style={{ marginBottom: 24 }}>
              <Heading as="h3" style={{ fontSize: 18, margin: "0 0 16px", color: "#0f172a" }}>
                Order Items
              </Heading>

              {items.map((item, index) => (
                <Section
                  key={`${item.productName}-${index}`}
                  style={{
                    borderBottom: index === items.length - 1 ? "none" : "1px solid #e2e8f0",
                    padding: "12px 0",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <Section style={{ flex: 1 }}>
                    <Text style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                      {item.productName}
                    </Text>
                    <Text style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
                      Qty: {item.quantity}
                    </Text>
                  </Section>

                  <Text style={{ margin: 0, fontSize: 14, color: "#334155", fontWeight: 700 }}>
                    {formatCurrency(item.linePrice)}
                  </Text>
                </Section>
              ))}
            </Section>

            <Section
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: 20,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                Total Amount
              </Text>
              <Text style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {formatCurrency(totalAmount)}
              </Text>
            </Section>

            {shippingLines.length > 0 && (
              <Section style={{ marginBottom: 24 }}>
                <Heading as="h3" style={{ fontSize: 18, margin: "0 0 16px", color: "#0f172a" }}>
                  Shipping Details
                </Heading>
                <Text style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#334155" }}>
                  {shippingLines.join("\n")}
                </Text>
              </Section>
            )}

            <Section style={{ marginTop: 8 }}>
              <Link href={adminDashboardUrl} style={{ color: "#2563eb", fontWeight: 700 }}>
                Open Admin Dashboard
              </Link>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
