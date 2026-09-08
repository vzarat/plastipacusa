"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Locale = "en" | "es";

export const translations = {
  en: {
    // Navigation
    "nav.products": "Products",
    "nav.categories": "Categories",
    "nav.about": "About Us",
    "nav.contact": "Contact",
    "nav.signIn": "Sign In",
    "nav.register": "Register",
    "nav.requestQuote": "Request Quote",
    "nav.cart": "Cart / Quote",
    "nav.cartOnly": "Cart",
    "nav.dashboard": "Client Dashboard",
    "nav.signOut": "Sign Out",
    "nav.hotline": "Direct Sales Hotline",
    "nav.portal": "Industrial Partner",
    "nav.language": "Language",

    // Common
    "common.active": "Active",
    "common.close": "Close",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.download": "Download",
    "common.loading": "Loading...",
    "common.viewAll": "View All",
    "common.usd": "USD",

    // Dashboard
    "dashboard.title": "Commercial Portal",
    "dashboard.welcome": "Welcome back",
    "dashboard.orders": "Orders",
    "dashboard.overviewOrders": "Orders",
    "dashboard.quickReorders": "Quick Reorders",
    "dashboard.invoices": "Invoices",
    "dashboard.invoicesStatements": "Invoices & Statements",
    "dashboard.account": "Account Settings",
    "dashboard.support": "Support Hotline",
    "dashboard.storefrontCatalog": "Storefront Catalog",
    "dashboard.tier": "Factory Direct Tier",
    "dashboard.directDesk": "Direct Desk:",
    "dashboard.commercialAccount": "Commercial Account",
    "dashboard.factoryDirectPricing": "Factory Direct Pricing",
    "dashboard.browseCatalog": "Browse Catalog",
    "dashboard.customTruckload": "Custom Truckload Quote",
    "dashboard.totalOrders": "Total Recurring Orders",
    "dashboard.poOrders": "PO Orders",
    "dashboard.totalProcurement": "Total historical procurement:",
    "dashboard.lastOrder": "Last Order Dispatched",
    "dashboard.noRecentPo": "No Recent PO",
    "dashboard.dispatchTime": "Direct plant dispatch in 24–48 hours",
    "dashboard.reorderStatus": "Quick Reorder Status",
    "dashboard.oneClickActive": "1-Click Active",
    "dashboard.pricingLocked": "Direct factory volume pricing locked to your account.",
    "dashboard.reorderHub": "Quick Reorder Hub",
    "dashboard.directSchedule": "Factory Direct Schedule",
    "dashboard.instantReorders": "Instant Pallet & PO Reorders",
    "dashboard.reorderDesc": "Quickly repeat prior purchase orders or dispatch calibrated full pallet batches directly into your production line without re-negotiating terms.",
    "dashboard.fastOrderPallet": "1-Click Fast Reorder: Standard Pallet Batches",
    "dashboard.fastOrderDesc": "Frequently replenished warehouse specs. Click to add a calibrated full pallet batch immediately into your cart.",
    "dashboard.orderPallet64": "Fast Order Pallet (64 Boxes)",
    "dashboard.orderPallet50": "Fast Order Pallet (50 Rolls)",
    "dashboard.orderHistory": "Order History & Quick Reorder",
    "dashboard.historyDesc": "Review past purchase orders, dispatch tracking, and trigger 1-click repeat orders.",
    "dashboard.reviewCart": "Review Cart →",
    "dashboard.tablePoId": "PO / Order ID",
    "dashboard.tableDate": "Date",
    "dashboard.tableProducts": "Products & Batch Summary",
    "dashboard.tableTotal": "Total (USD)",
    "dashboard.tableStatus": "Fulfillment Status",
    "dashboard.tableAction": "Action",
    "dashboard.statusDelivered": "Delivered",
    "dashboard.statusInTransit": "In Transit",
    "dashboard.statusQueue": "Production Queue",
    "dashboard.btnQuickReorder": "Quick Reorder",
    "dashboard.invoicesTitle": "Invoices & Commercial Statements",
    "dashboard.invoicesDesc": "Download verified tax invoices, proof of bill of lading (BOL), and accounting summaries.",
    "dashboard.invNumber": "Invoice #",
    "dashboard.invPoRef": "PO Ref",
    "dashboard.invDate": "Issue Date",
    "dashboard.invTerms": "Payment Terms",
    "dashboard.invAmount": "Amount",
    "dashboard.invStatus": "Status",
    "dashboard.invDocument": "Document",
    "dashboard.net30": "Commercial Net 30",
    "dashboard.paidCleared": "Paid & Cleared",
    "dashboard.pdfInvoice": "PDF Invoice",
    "dashboard.settingsTitle": "Account Settings & Company Profile",
    "dashboard.settingsDesc": "Verified B2B organization records, shipping locations, and direct procurement contacts.",
    "dashboard.entityReg": "Commercial Entity Registration",
    "dashboard.regEntity": "Registered Entity",
    "dashboard.primaryContact": "Primary Procurement Contact",
    "dashboard.corpEmail": "Corporate Email",
    "dashboard.priceSchedule": "Pricing Schedule",
    "dashboard.wholesaleSchedule": "Factory Direct Wholesale Schedule",
    "dashboard.taxCert": "Resale Tax Certificate",
    "dashboard.activeVerified": "Active / Verified",
    "dashboard.assignedRep": "Assigned Factory Representative",
    "dashboard.accountSpecialist": "Account Specialist",
    "dashboard.opsDesk": "Commercial Operations Desk",
    "dashboard.hotlineDesk": "Hotline",
    "dashboard.dispatchAssist": "Dispatch Assistance",
    "dashboard.directEmail": "Direct Email",
    "dashboard.helpTitle": "Manufacturer Support & Freight Desk",
    "dashboard.helpDesc": "Need emergency truckload fulfillment, custom micrometer gauge calibration, or logistics coordination?",
    "dashboard.hotlineTitle": "Direct Sales Hotline",
    "dashboard.hotlineSubtitle": "Direct communication with packaging engineers and contract managers.",
    "dashboard.freightDesk": "Freight Desk",
    "dashboard.facilityTitle": "Manufacturing Facility",
    "dashboard.facilitySubtitle": "State-of-the-art cast co-extrusion production facility located in Texas.",
    "dashboard.plantName": "Plastipac USA Manufacturing Plant",
    "dashboard.plantLocation": "Texas, United States",

    // Admin
    "admin.orders": "Orders",
    "admin.commercialOrders": "Commercial Orders",
    "admin.totalCount": "Total",
    "admin.totalSales": "Total Sales",
    "admin.salesDesc": "Commercial wholesale gross",
    "admin.totalOrders": "Total Orders",
    "admin.ordersDesc": "Recurring & pallet batch requests",
    "admin.aov": "Average Order Value",
    "admin.aovDesc": "Avg pallet shipment ticket size",
    "admin.pendingShipments": "Pending / Unfulfilled",
    "admin.pendingDesc": "Requires warehouse dispatch schedule",
    "admin.exportCsv": "Export CSV",
    "admin.createOrder": "Create Order",
    "admin.all": "All",
    "admin.unfulfilled": "Unfulfilled",
    "admin.unpaid": "Unpaid",
    "admin.open": "Open",
    "admin.archived": "Archived",
    "admin.searchPlaceholder": "Filter orders by ID, client, company, or spec...",
    "admin.paymentAll": "Payment: All",
    "admin.paymentPaid": "Payment: Paid",
    "admin.paymentPending": "Payment: Pending",
    "admin.paymentRefunded": "Payment: Refunded",
    "admin.fulfillmentAll": "Fulfillment: All",
    "admin.statusFulfilled": "Fulfilled",
    "admin.statusInTransit": "In Transit",
    "admin.statusUnfulfilled": "Unfulfilled",
    "admin.statusCancelled": "Cancelled",
    "admin.ordersSelected": "orders selected",
    "admin.markFulfilled": "Mark as Fulfilled",
    "admin.exportSelected": "Export Selected",
    "admin.colOrder": "Order #",
    "admin.colDate": "Date",
    "admin.colCustomer": "Customer & Company",
    "admin.colTotal": "Total (USD)",
    "admin.colPayment": "Payment",
    "admin.colFulfillment": "Fulfillment",
    "admin.colItems": "Items / Batch",
    "admin.colAction": "Action",
    "admin.paid": "Paid",
    "admin.pending": "Pending",
    "admin.refunded": "Refunded",
    "admin.inspect": "Inspect",
    "admin.customer": "Customer & Organization",
    "admin.delivery": "Delivery Destination & Logistics",
    "admin.orderItems": "Order Items",
    "admin.noOrdersFound": "No orders match your filter criteria.",
    "admin.noOrdersDesc": "Try searching for a different term or resetting the active status filter.",
    "admin.placedOn": "Placed on",
    "admin.updateStatus": "Update Status",
    "admin.clientPortal": "Client Portal",
  },
  es: {
    // Navigation
    "nav.products": "Productos",
    "nav.categories": "Categorías",
    "nav.about": "Nosotros",
    "nav.contact": "Contacto",
    "nav.signIn": "Iniciar Sesión",
    "nav.register": "Registrarse",
    "nav.requestQuote": "Solicitar Cotización",
    "nav.cart": "Carrito",
    "nav.cartOnly": "Carrito",
    "nav.dashboard": "Panel de Cliente",
    "nav.signOut": "Cerrar Sesión",
    "nav.hotline": "Línea Directa de Ventas",
    "nav.portal": "Socio Industrial",
    "nav.language": "Idioma",

    // Common
    "common.active": "Activo",
    "common.close": "Cerrar",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.download": "Descargar",
    "common.loading": "Cargando...",
    "common.viewAll": "Ver Todo",
    "common.usd": "USD",

    // Dashboard
    "dashboard.title": "Portal Comercial",
    "dashboard.welcome": "Bienvenido de nuevo",
    "dashboard.orders": "Pedidos",
    "dashboard.overviewOrders": "Pedidos",
    "dashboard.quickReorders": "Pedidos Rápidos",
    "dashboard.invoices": "Facturas",
    "dashboard.invoicesStatements": "Facturas y Estados",
    "dashboard.account": "Ajustes",
    "dashboard.support": "Línea de Soporte",
    "dashboard.storefrontCatalog": "Catálogo General",
    "dashboard.tier": "Nivel Directo de Fábrica",
    "dashboard.directDesk": "Atención Directa:",
    "dashboard.commercialAccount": "Cuenta Comercial",
    "dashboard.factoryDirectPricing": "Precios Directos de Fábrica",
    "dashboard.browseCatalog": "Ver Catálogo",
    "dashboard.customTruckload": "Cotizar Camión Completo",
    "dashboard.totalOrders": "Total de Pedidos Recurrentes",
    "dashboard.poOrders": "Pedidos",
    "dashboard.totalProcurement": "Compras históricas totales:",
    "dashboard.lastOrder": "Último Pedido Despachado",
    "dashboard.noRecentPo": "Sin Pedidos Recientes",
    "dashboard.dispatchTime": "Despacho directo de planta en 24–48 horas",
    "dashboard.reorderStatus": "Estado de Reorden",
    "dashboard.oneClickActive": "1-Clic Activo",
    "dashboard.pricingLocked": "Precios por volumen de fábrica asegurados para su cuenta.",
    "dashboard.reorderHub": "Centro de Pedidos Rápidos",
    "dashboard.directSchedule": "Calendario Directo de Fábrica",
    "dashboard.instantReorders": "Pedidos Rápidos de Tarimas y Órdenes",
    "dashboard.reorderDesc": "Repita rápidamente órdenes de compra anteriores o despache lotes completos de tarimas directamente a su línea sin renegociar términos.",
    "dashboard.fastOrderPallet": "Reorden Rápido en 1-Clic: Tarimas Estándar",
    "dashboard.fastOrderDesc": "Especificaciones de almacén de alta rotación. Haga clic para agregar una tarima completa calibrada a su carrito.",
    "dashboard.orderPallet64": "Pedir Tarima Rápido (64 Cajas)",
    "dashboard.orderPallet50": "Pedir Tarima Rápido (50 Rollos)",
    "dashboard.orderHistory": "Historial de Pedidos y Reorden",
    "dashboard.historyDesc": "Revise órdenes de compra anteriores, rastreo de envíos y repita pedidos en 1 clic.",
    "dashboard.reviewCart": "Ver Carrito →",
    "dashboard.tablePoId": "ID de Pedido / OC",
    "dashboard.tableDate": "Fecha",
    "dashboard.tableProducts": "Productos y Resumen",
    "dashboard.tableTotal": "Total (USD)",
    "dashboard.tableStatus": "Estado de Entrega",
    "dashboard.tableAction": "Acción",
    "dashboard.statusDelivered": "Entregado",
    "dashboard.statusInTransit": "En Tránsito",
    "dashboard.statusQueue": "En Producción",
    "dashboard.btnQuickReorder": "Reordenar",
    "dashboard.invoicesTitle": "Facturas y Estados Comerciales",
    "dashboard.invoicesDesc": "Descargue facturas fiscales verificadas, comprobantes de conocimiento de embarque (BOL) y resúmenes contables.",
    "dashboard.invNumber": "Factura #",
    "dashboard.invPoRef": "Ref. de Pedido",
    "dashboard.invDate": "Fecha de Emisión",
    "dashboard.invTerms": "Términos de Pago",
    "dashboard.invAmount": "Monto",
    "dashboard.invStatus": "Estado",
    "dashboard.invDocument": "Documento",
    "dashboard.net30": "Comercial a 30 Días",
    "dashboard.paidCleared": "Pagado y Liquidado",
    "dashboard.pdfInvoice": "Factura PDF",
    "dashboard.settingsTitle": "Ajustes de Cuenta y Perfil de Empresa",
    "dashboard.settingsDesc": "Registros verificados de organizaciones B2B, ubicaciones de entrega y contactos de adquisiciones.",
    "dashboard.entityReg": "Registro de Entidad Comercial",
    "dashboard.regEntity": "Entidad Registrada",
    "dashboard.primaryContact": "Contacto Principal de Compras",
    "dashboard.corpEmail": "Correo Corporativo",
    "dashboard.priceSchedule": "Esquema de Precios",
    "dashboard.wholesaleSchedule": "Esquema Mayorista Directo de Fábrica",
    "dashboard.taxCert": "Certificado de Exención Fiscal",
    "dashboard.activeVerified": "Activo / Verificado",
    "dashboard.assignedRep": "Representante de Fábrica Asignado",
    "dashboard.accountSpecialist": "Especialista de Cuenta",
    "dashboard.opsDesk": "Mesa de Operaciones Comerciales",
    "dashboard.hotlineDesk": "Línea Directa",
    "dashboard.dispatchAssist": "Asistencia de Despacho",
    "dashboard.directEmail": "Correo Directo",
    "dashboard.helpTitle": "Soporte del Fabricante y Mesa de Carga",
    "dashboard.helpDesc": "¿Necesita surtido urgente de camión completo, calibración de calibre micrométrico o logística?",
    "dashboard.hotlineTitle": "Línea Directa de Ventas",
    "dashboard.hotlineSubtitle": "Comunicación directa con ingenieros de empaque y gerentes de contratos.",
    "dashboard.freightDesk": "Mesa de Carga",
    "dashboard.facilityTitle": "Planta de Fabricación",
    "dashboard.facilitySubtitle": "Instalación de producción de coextrusión cast de última generación en Texas.",
    "dashboard.plantName": "Planta de Fabricación Plastipac USA",
    "dashboard.plantLocation": "Texas, Estados Unidos",

    // Admin
    "admin.orders": "Pedidos",
    "admin.commercialOrders": "Pedidos Comerciales",
    "admin.totalCount": "Total",
    "admin.totalSales": "Ventas Totales",
    "admin.salesDesc": "Bruto mayorista comercial",
    "admin.totalOrders": "Total de Pedidos",
    "admin.ordersDesc": "Solicitudes recurrentes y por tarimas",
    "admin.aov": "Valor Promedio de Pedido",
    "admin.aovDesc": "Promedio por envío de tarimas",
    "admin.pendingShipments": "Pendientes / Por Enviar",
    "admin.pendingDesc": "Requiere programación de almacén",
    "admin.exportCsv": "Exportar CSV",
    "admin.createOrder": "Crear Pedido",
    "admin.all": "Todos",
    "admin.unfulfilled": "Por Enviar",
    "admin.unpaid": "No Pagados",
    "admin.open": "Abiertos",
    "admin.archived": "Archivados",
    "admin.searchPlaceholder": "Filtrar pedidos por ID, cliente, empresa o especificación...",
    "admin.paymentAll": "Pago: Todos",
    "admin.paymentPaid": "Pago: Pagado",
    "admin.paymentPending": "Pago: Pendiente",
    "admin.paymentRefunded": "Pago: Reembolsado",
    "admin.fulfillmentAll": "Entrega: Todos",
    "admin.statusFulfilled": "Entregado",
    "admin.statusInTransit": "En Tránsito",
    "admin.statusUnfulfilled": "Por Enviar",
    "admin.statusCancelled": "Cancelado",
    "admin.ordersSelected": "pedidos seleccionados",
    "admin.markFulfilled": "Marcar como Entregado",
    "admin.exportSelected": "Exportar Seleccionados",
    "admin.colOrder": "Pedido #",
    "admin.colDate": "Fecha",
    "admin.colCustomer": "Cliente y Empresa",
    "admin.colTotal": "Total (USD)",
    "admin.colPayment": "Pago",
    "admin.colFulfillment": "Entrega",
    "admin.colItems": "Artículos / Lote",
    "admin.colAction": "Acción",
    "admin.paid": "Pagado",
    "admin.pending": "Pendiente",
    "admin.refunded": "Reembolsado",
    "admin.inspect": "Inspeccionar",
    "admin.customer": "Cliente y Organización",
    "admin.delivery": "Destino de Entrega y Logística",
    "admin.orderItems": "Artículos del Pedido",
    "admin.noOrdersFound": "No hay pedidos que coincidan con sus criterios de búsqueda.",
    "admin.noOrdersDesc": "Intente buscar otro término o restablecer el filtro de estado activo.",
    "admin.placedOn": "Realizado el",
    "admin.updateStatus": "Actualizar Estado",
    "admin.clientPortal": "Portal de Cliente",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
  isSpanish: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "plastipac_locale";
const COOKIE_NAME = "NEXT_LOCALE";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Read initial locale from localStorage or cookie on mount
  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (savedLocale === "en" || savedLocale === "es") {
        setLocaleState(savedLocale);
        document.documentElement.lang = savedLocale;
        return;
      }

      // Check cookies
      const match = document.cookie.match(new RegExp("(^| )" + COOKIE_NAME + "=([^;]+)"));
      if (match && (match[2] === "en" || match[2] === "es")) {
        setLocaleState(match[2] as Locale);
        document.documentElement.lang = match[2];
        return;
      }

      // Check navigator language
      if (typeof navigator !== "undefined" && navigator.language?.startsWith("es")) {
        setLocaleState("es");
        document.documentElement.lang = "es";
      }
    } catch {
      // Ignore local storage read errors
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.cookie = `${COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;
    } catch {
      // Ignore persistence errors
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "en" ? "es" : "en");
  };

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const activeDict = translations[locale] as Record<string, string>;
    const defaultDict = translations.en as Record<string, string>;
    return activeDict[key] || defaultDict[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        toggleLocale,
        t,
        isSpanish: locale === "es",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Safe fallback if used outside provider
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: string, fallback?: string) => fallback || key,
      isSpanish: false,
    };
  }
  return context;
}

