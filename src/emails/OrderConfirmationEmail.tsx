import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";

export interface OrderConfirmationEmailItem {
  quantity: number;
  productName: string;
  linePrice: number;
}

interface OrderConfirmationEmailProps {
  orderId: string;
  customerName: string;
  companyName: string;
  orderDate: string;
  totalAmount: number;
  items: OrderConfirmationEmailItem[];
  locale?: "en" | "es";
}

const copy = {
  en: {
    preview: "Your Plastipac USA order is confirmed.",
    title: "Order Confirmation",
    greeting: "Hello",
    details: "We’ve received your order and it’s now being prepared for fulfillment.",
    orderId: "Order ID",
    clientName: "Client Name",
    companyName: "Company Name",
    orderDate: "Order Date",
    itemsTitle: "Order Items",
    quantity: "Qty",
    product: "Product",
    linePrice: "Line Price",
    total: "Total Amount",
    footer: "Thank you for choosing Plastipac USA.",
  },
  es: {
    preview: "Su pedido de Plastipac USA está confirmado.",
    title: "Confirmación de Pedido",
    greeting: "Hola",
    details: "Hemos recibido su pedido y ahora está siendo preparado para su cumplimiento.",
    orderId: "ID del Pedido",
    clientName: "Nombre del Cliente",
    companyName: "Nombre de la Empresa",
    orderDate: "Fecha del Pedido",
    itemsTitle: "Artículos del Pedido",
    quantity: "Cant.",
    product: "Producto",
    linePrice: "Precio por Línea",
    total: "Monto Total",
    footer: "Gracias por elegir Plastipac USA.",
  },
};

const formatCurrency = (amount: number, locale: "en" | "es") =>
  new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateString: string, locale: "en" | "es") =>
  new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(dateString));

export function OrderConfirmationEmail({
  orderId,
  customerName,
  companyName,
  orderDate,
  totalAmount,
  items,
  locale = "en",
}: OrderConfirmationEmailProps) {
  const text = copy[locale];

  return (
    <Html>
      <Head />
      <Preview>{text.preview}</Preview>
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
                Plastipac USA
              </Text>
              <Heading style={{ fontSize: 32, margin: "0 0 12px", color: "#0f172a" }}>
                {text.title}
              </Heading>
              <Text style={{ fontSize: 16, lineHeight: 1.6, color: "#334155", margin: "0 0 24px" }}>
                {text.greeting} {customerName},<br />
                {text.details}
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
              <Text style={{ margin: 0, fontSize: 13, color: "#64748b", marginBottom: 10 }}>
                {text.orderId}: <strong style={{ color: "#0f172a" }}>{orderId}</strong>
              </Text>
              <Text style={{ margin: 0, fontSize: 13, color: "#64748b", marginBottom: 10 }}>
                {text.clientName}: <strong style={{ color: "#0f172a" }}>{customerName}</strong>
              </Text>
              <Text style={{ margin: 0, fontSize: 13, color: "#64748b", marginBottom: 10 }}>
                {text.companyName}: <strong style={{ color: "#0f172a" }}>{companyName}</strong>
              </Text>
              <Text style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                {text.orderDate}: <strong style={{ color: "#0f172a" }}>{formatDate(orderDate, locale)}</strong>
              </Text>
            </Section>

            <Section style={{ marginBottom: 24 }}>
              <Heading as="h3" style={{ fontSize: 18, margin: "0 0 16px", color: "#0f172a" }}>
                {text.itemsTitle}
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
                      {text.quantity}: {item.quantity}
                    </Text>
                  </Section>

                  <Text style={{ margin: 0, fontSize: 14, color: "#334155", fontWeight: 700 }}>
                    {formatCurrency(item.linePrice, locale)}
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
              }}
            >
              <Text style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                {text.total}
              </Text>
              <Text style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                {formatCurrency(totalAmount, locale)}
              </Text>
            </Section>

            <Section style={{ marginTop: 28 }}>
              <Text style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#475569" }}>
                {text.footer}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
