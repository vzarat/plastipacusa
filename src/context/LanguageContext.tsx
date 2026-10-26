"use client";

import React, { createContext, useCallback, useContext, useMemo, useEffect, ReactNode } from "react";

export type Locale = "en" | "es";

/** Storefront copy is English only. */
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
    "nav.dashboard": "Client Dashboard",
    "nav.adminPortal": "Admin Operations",
    "nav.signOut": "Sign Out",
    "nav.hotline": "Direct Sales Hotline",
    "nav.portal": "Industrial Partner",
    "nav.language": "Language",

    // Roles
    "role.admin": "Admin",
    "role.client": "Registered Customer",
    "role.partner": "Company",

    // Auth
    "auth.googleContinue": "Continue with Google",
    "auth.setupPasswordTitle": "Set your backup password",
    "auth.setupPasswordSubtitle": "Set a password so you can also log in directly with your email.",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.savePassword": "Save Password",
    "auth.skipForNow": "Skip for now",

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
    "dashboard.title": "Customer Portal",
    "dashboard.portalCommercial": "Customer Portal",
    "dashboard.welcome": "Welcome back",
    "dashboard.goodMorning": "Good morning",
    "dashboard.goodAfternoon": "Good afternoon",
    "dashboard.goodEvening": "Good evening",
    "dashboard.valuedCustomer": "Valued Customer",
    "dashboard.greetingSubtitle":
      "Here’s a quick look at your commercial account and open opportunities.",
    "dashboard.promoCarouselLabel": "Account announcements",
    "dashboard.promoEyebrow": "Plastipac Updates",
    "dashboard.promoSlide": "Slide",
    "dashboard.promo1Title": "Exclusive B2B Offers",
    "dashboard.promo1Body":
      "Up to 15% off on bulk Machine Film orders.",
    "dashboard.promo1Cta": "View Machine Film",
    "dashboard.promo2Title": "Fast USA Shipping",
    "dashboard.promo2Body":
      "Guaranteed 48-hr dispatch across all US states.",
    "dashboard.promo2Cta": "Browse Catalog",
    "dashboard.promo3Title": "Net 30 Credit Line Available",
    "dashboard.promo3Body": "Apply today for flexible financing.",
    "dashboard.promo3Cta": "Apply for Credit",
    "dashboard.creditSlideBadge": "Commercial Credit",
    "dashboard.creditSlideTitle": "Apply for B2B Credit & Net 30 Terms",
    "dashboard.creditSlideSubtitle":
      "Streamline high-volume freight orders with dedicated lines of credit, PO checkout, and Net 30 terms for verified accounts.",
    "dashboard.creditSlideCta": "Start Credit Application",
    "dashboard.creditSlideBrowse": "Browse catalog while you apply →",
    "dashboard.sampleSlideBadge": "Free Sample",
    "dashboard.sampleSlideTitle": "Request Your Free Sample Roll",
    "dashboard.sampleSlideSubtitle":
      "Test Plastipac high-performance stretch film in your warehouse facility before placing bulk orders. Zero obligation.",
    "dashboard.sampleSlideCta": "Request Free Sample",
    "dashboard.sampleSlideLearn": "Learn about our gauge options →",
    "dashboard.shippingSlideBadge": "Nationwide Coverage",
    "dashboard.shippingSlideTitle": "Fast & Reliable Nationwide Shipping",
    "dashboard.shippingSlideSubtitle":
      "We proudly ship Plastipac High-Performance Stretch Film to every corner of the USA, ensuring guaranteed quality delivery across all 50 states.",
    "dashboard.shippingSlideCta": "View Shipping Options",
    "dashboard.emptyStateWelcome": "Welcome to Plastipac!",
    "dashboard.emptyStateSubtitle": "You haven’t placed an order yet. Start with our catalog and build your first pallet batch.",
    "dashboard.emptyStateCta": "Browse Catalog",
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
    "dashboard.commercialAccount": "Registered Customer",
    "dashboard.factoryDirectPricing": "Factory Direct Pricing",
    "dashboard.browseCatalog": "Browse Catalog",
    "dashboard.customTruckload": "Custom Truckload Quote",
    "dashboard.totalOrders": "Total Recurring Orders",
    "dashboard.poOrders": "PO Orders",
    "dashboard.totalProcurement": "Total historical procurement:",
    "dashboard.lastOrder": "Last Order Dispatched",
    "dashboard.noRecentPo": "No Recent PO",
    "dashboard.dispatchTime": "Direct plant dispatch in 24–48 hours",
    "dashboard.quickReorderAdded": "All items from {orderId} were added to your cart for instant reorder.",
    "dashboard.fastPalletAdded": "1 Full Pallet batch of {productName} was added to your cart.",
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
    "dashboard.settingsDesc": "Registered customer profile details, delivery preferences, and account information.",
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
    "admin.overview": "Overview / Dashboard",
    "admin.ordersQuotes": "Orders & Quotes",
    "admin.catalog": "Product Catalog",
    "admin.customers": "Customers",
    "admin.settings": "Settings / System",
    "admin.activeQuotes": "Active Orders / Quotes",
    "admin.activeQuotesDesc": "Live commercial requests requiring action",
    "admin.fulfilledTruckloads": "Fulfilled Freight & Pallets",
    "admin.fulfilledTruckloadsDesc": "Dispatched factory batches",
    "admin.revenueMoM": "+14.2% vs last month",
    "admin.filterAll": "All Orders",
    "admin.filterUnfulfilled": "Unfulfilled",
    "admin.filterPendingPayment": "Pending Payment",
    "admin.filterInTransit": "In Transit",
    "admin.filterCompleted": "Completed",
    "admin.manageCatalog": "Film stock inventory, pricing tiers, and master specifications",
    "admin.manageCustomers": "Registered customer accounts and account details",
    "admin.manageSettings": "Logistics dispatch hubs, carrier configs, and system policies",
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
    "admin.fulfilled": "Fulfilled",
    "admin.open": "Open",
    "admin.archived": "Archived",
    "admin.aovShort": "Average Order Value (AOV)",
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
    "admin.bentoRevenueTitle": "Revenue & Pallet Volume Trend",
    "admin.bentoRevenueSubtitle": "Monthly commercial sales revenue ($ USD) and total pallets shipped across freight lines.",
    "admin.bentoRevenuePeak": "Peak Monthly Velocity",
    "admin.bentoRevenueGrowth": "0% vs prior period",
    "admin.bentoPallets": "Pallets Shipped",
    "admin.bentoRevenue": "Gross Revenue",
    "admin.bentoTime7D": "7D",
    "admin.bentoTime1M": "1M",
    "admin.bentoTime1Y": "1Y",
    "admin.bentoTimeYTD": "YTD",
    "admin.bentoFulfillmentTitle": "Fulfillment & Freight Status",
    "admin.bentoFulfillmentSubtitle": "Active U.S. freight dispatches and yard queue",
    "admin.bentoOnTimeRate": "On-Time Dispatch",
    "admin.bentoStatusDelivered": "Delivered",
    "admin.bentoStatusInTransit": "In Transit",
    "admin.bentoStatusProcessing": "In Process",
    "admin.bentoStatusPending": "Pending",
    "admin.bentoActivityTitle": "Live Warehouse Activity",
    "admin.bentoCategoryTitle": "Orders by Product Category",
    "admin.bentoCategorySubtitle": "Distribution across specialized extrusion lines",
    "admin.bentoCatHand": "Force™ Hand Stretch Film",
    "admin.bentoCatMachine": "Machine Cast Film (High Speed)",
    "admin.bentoCatNano": "Pre-Stretch Nano Coreless",
    "admin.bentoCatEdge": "Edge Protectors & V-Board",
    "admin.bentoRecentOrders": "Recent High-Value Orders",
    "admin.bentoRecentOrdersSubtitle": "Direct commercial contract batches ready for dispatch",
    "admin.bentoActiveAccounts": "Active Customers",
    "admin.bentoActiveAccountsDesc": "Approved commercial enterprise clients",
    "admin.viewAll": "View All",
    "admin.truckloads": "Truckloads",
    "admin.pallets": "Pallets",
    "admin.noPartNumber": "No Part #",
    "admin.noDescription": "No description provided.",
    "admin.inStock": "In Stock",
    "admin.outOfStock": "Out of stock",
    "admin.soldOut": "Sold Out",
    "admin.available": "Available",
    "admin.edit": "Edit",
    "admin.active": "Active",
    "admin.inactive": "Inactive",
    "admin.addProduct": "Add Product",
    "admin.searchCatalog": "Search by title, part number, or description...",
    "admin.handFilm": "Hand Stretch Film",
    "admin.machineFilm": "Automatic / Machine",
    "admin.gaugeFilter": "Gauge",
    "admin.statusAll": "Status: All",
    "admin.draftInactive": "Draft / Inactive",
    "admin.clearFilters": "Clear Filters",
    "admin.lengthLabel": "Length",
    "admin.showing": "Showing",
    "admin.of": "of",
    "admin.productsCount": "products",
    "admin.noProducts": "No products found.",
    "admin.deleteProduct": "Delete product",
    "admin.deactivate": "Deactivate",
    "admin.activate": "Activate",
    "admin.manualHand": "Manual Hand",
    "admin.automatedMachine": "Automated Machine",
    "admin.specHand": "Hand",
    "admin.specMachine": "Machine",
    "admin.discounts": "Discounts",
    "admin.emailTemplates": "Email Templates",
    "admin.users": "Users",
    "admin.creditApplications": "Credit Applications",
    "admin.editProduct": "Edit Product",
    "admin.addNewProduct": "Add New Product",
    "admin.productTitle": "Product Title",
    "admin.partNumber": "Part Number / SKU",
    "admin.storefrontTitle": "Storefront Title / Display Name",
    "admin.storefrontHint": "Shown on the public catalog card. Falls back to Product Title when left blank.",
    "admin.description": "Description",
    "admin.basePrice": "Base Unit Price (USD)",
    "admin.stockQty": "Stock (Pallets)",
    "admin.stockPalletsHint": "Enter total available full pallets in stock.",
    "admin.application": "Application",
    "admin.applicationHint": "Auto-set from Category (GENESIS = Machine).",
    "admin.category": "Category",
    "admin.activeVisible": "Active / Visible in store",
    "admin.availability": "Availability",
    "admin.pricingTiers": "Pricing & Volume Tiers",
    "admin.casePrice": "Case / Box Price (USD)",
    "admin.halfPalletPrice": "Half Pallet Price (USD)",
    "admin.fullPalletPrice": "Full Pallet Price (USD)",
    "admin.packageOptionsTitle": "Package Options & Tier Pricing",
    "admin.imageUrl": "Image URL",
    "admin.productImages": "Product Images",
    "admin.upload": "Upload",
    "admin.saveChanges": "Save Changes",
    "admin.createProduct": "Create Product",
    "admin.saving": "Saving...",
    "admin.priceUsd": "Price (USD)",

    // Product Catalog / Detail
    "products.filterProducts": "Filter Products",
    "products.filter": "Filter",
    "products.reset": "Reset",
    "products.applicationType": "Application Type",
    "products.allPackagingFilms": "All Packaging Films",
    "products.handStretchFilmSeries": "Hand Stretch Film Series",
    "products.machineHighYieldFilm": "Machine High-Yield Film",
    "products.targetGauge": "Target Gauge",
    "products.allGauges": "All Gauges",
    "products.rollLength": "Roll Length",
    "products.allLengths": "All Lengths",
    "products.filmWidth": "Film Width",
    "products.allWidths": "All Widths",
    "products.packageOptions": "Package Options & Tier Pricing",
    "products.specifications": "Specifications",
    "products.width": "Width",
    "products.gauge": "Gauge",
    "products.length": "Length",
    "products.coreType": "Core Type",
    "products.quantity": "Quantity",
    "products.subtotal": "Subtotal",
    "products.addToCart": "Add to Cart",
    "products.paypalExpressCheckout": "Express Checkout",
    "products.directCheckout": "Proceed to Checkout",
    "products.inStock": "In Stock",
    "products.onePalletAvailable": "1 Pallet Available",
    "products.palletsAvailable": "{count} Pallets Available",
    "products.soldOut": "Sold Out",
    "products.outOfStock": "Out of stock",
    "products.readyToShip": "Ready to Ship",
    "products.startingAt": "Starting at",
    "products.buyNow": "Buy Now",
    "products.searchPlaceholder": "Search by product title, brand, or description...",
    "products.searchCatalog": "Search Catalog",
    "products.noProducts": "No products found",
    "products.noProductsHint": "No stretch film matched the selected application, gauge, length, or width. Try resetting your filters.",
    "products.prev": "Prev",
    "products.next": "Next",
    "products.officialFactoryDirectPrice": "Official Factory Direct Price",
    "products.usd": "USD",
    "products.usdPerUnit": "USD / Unit",
    "products.addedToCart": "Added {count}x {product} to your cart!",
    "products.needCustomSpecs": "Need custom specs? Call",
    "products.callSpecialist": "Call Specialist →",
    "products.portalCommercial": "Customer Portal",

    // Home / Landing
    "home.clientLogosTitle": "Industry leaders that trust our high-performance packaging solutions",

    // Announcement / US Pride Banner
    "banner.usPride": "Leader manufacturer of stretch film",

    // Footer
    "footer.tagline":
      "Expert manufacturer and distributor of high-yield GENESIS & FORCE stretch film systems across North America.",
    "footer.quickLinks": "Quick Links",
    "footer.products": "Products",
    "footer.categories": "Categories",
    "footer.about": "About Us",
    "footer.freeSample": "Request Free Sample",
    "footer.productCategories": "Product Categories",
    "footer.lineForceStandard": "FORCE Hand Stretch Film Standard",
    "footer.lineForceElite": "FORCE Hand Stretch Film Elite",
    "footer.lineGenesisStandard": "GENESIS Automatic Stretch Film Standard",
    "footer.lineGenesisHp": "GENESIS Automatic Stretch Film High Performance",
    "footer.creditCta": "Apply for B2B Credit (Net 30) →",
    "footer.contactSupport": "Contact & Support",
    "footer.businessHours": "USA Business Hours",
    "footer.hoursDetail": "Mon–Fri · 8:00 AM – 5:00 PM CST",
    "footer.rights": "© {year} Plastipac USA. All rights reserved.",
    "footer.terms": "Terms of Service",
    "footer.privacy": "Privacy Policy",

    // Homepage Categories
    "categories.badge": "Engineered Product Lines",
    "categories.title": "Select Film System & Specification",
    "categories.subtitle":
      "Choose between our high-yield manual hand wrap lines and heavy-duty automated machine stretch films.",

    // Products catalog page
    "catalog.badge": "Industrial Catalog",
    "catalog.title": "Stretch Films & Technical Specifications",
    "catalog.subtitle":
      "Browse our high-performance manual cast stretch films, complete dimensional specifications matrix, and direct wholesale volume pricing.",

    // B2B Credit Application
    "credit.badge": "Commercial Credit",
    "credit.title": "Apply for B2B Credit & Net 30 Commercial Terms",
    "credit.subtitle":
      "Streamline high-volume freight orders with dedicated lines of credit, Purchase Order (PO) checkout, and Net 30 payment terms for verified corporate accounts.",
    "credit.notice":
      "Net 30 and PO checkout are available to verified US corporate accounts after credit review. Incomplete applications may delay approval.",
    "credit.flowEyebrow": "How it works",
    "credit.flowTitle": "4-Step B2B Credit Flow",
    "credit.flowSubtitle":
      "From application to Net 30 settlement — built for high-volume freight and verified corporate accounts.",
    "credit.step1Title": "Apply for Credit",
    "credit.step1Desc": "Submit Tax ID (EIN) and corporate credit references.",
    "credit.step2Title": "Instant PO Checkout",
    "credit.step2Desc": "Enter official Purchase Order numbers at checkout.",
    "credit.step3Title": "Fast Dispatch",
    "credit.step3Desc": "Shipments dispatched within 24-48 hours.",
    "credit.step4Title": "Net 30 Terms",
    "credit.step4Desc":
      "Pay via ACH, Wire Transfer, or Corporate Check in 30 days.",
    "credit.formTitle": "Credit Application Form",
    "credit.formSubtitle": "Required for Net 30 commercial terms and PO checkout.",
    "credit.companyName": "Company Legal Name",
    "credit.contactName": "Contact / AP Name",
    "credit.taxId": "Tax ID (EIN)",
    "credit.email": "Corporate Email",
    "credit.phone": "Business Phone",
    "credit.billingAddress": "Billing Address",
    "credit.shippingAddress": "Shipping / Warehouse Address",
    "credit.street": "Street Address",
    "credit.city": "City",
    "credit.state": "State",
    "credit.selectState": "Select state…",
    "credit.zip": "ZIP Code",
    "credit.country": "Country",
    "credit.countryNote":
      "Credit terms are exclusively available for US-based businesses.",
    "credit.annualVolume": "Estimated Annual Stretch Film Volume",
    "credit.referencesHeading": "Corporate Credit References",
    "credit.reference1": "Reference 1 (required) — Company, Contact, Phone",
    "credit.reference2": "Reference 2 (optional)",
    "credit.reference3": "Reference 3 (optional)",
    "credit.notes": "Additional Notes",
    "credit.authNote":
      "By submitting, you authorize Plastipac USA to verify corporate credit references for Net 30 eligibility.",
    "credit.submit": "Submit Credit Application",
    "credit.submitting": "Submitting…",
    "credit.questions": "Questions? Call",
    "credit.successTitle": "Application Received",
    "credit.successBody":
      "Thank you. A Plastipac USA credit specialist will review your Tax ID, corporate references, and volume profile, then follow up with Net 30 eligibility and PO checkout activation.",
    "credit.browseCatalog": "Browse Catalog",
    "credit.backHome": "Back to Home",

    // Hero Section
    "hero.badge": "Engineered for Maximum Pallet Load Containment",
    "hero.titlePart1": "Industrial Strength.",
    "hero.titlePart2": "Precision Stretch Film.",
    "hero.description": "Plastipac USA manufactures high-performance cast stretch films engineered with multi-layer nano-technology. Cut film consumption by up to 40% while locking pallets down with zero freight damage.",
    "hero.exploreBtn": "Explore Product Catalog",
    "hero.quoteBtn": "Request Wholesale Quote",
    "hero.badgePreStretch": "Up to 300%+ Pre-stretch yield",
    "hero.badgePreStretchTitle": "Up to 300%+",
    "hero.badgePreStretchSub": "Pre-stretch yield",
    "hero.badgePuncture": "Extreme Puncture Hold Multi-layer cast strength",
    "hero.badgePunctureTitle": "Extreme Puncture Hold",
    "hero.badgePunctureSub": "Multi-layer cast strength",
    "hero.badgeFactory": "Factory Direct Truckload pricing",
    "hero.badgeFactoryTitle": "Factory Direct",
    "hero.badgeFactorySub": "Truckload pricing",
    "hero.flagshipSeries": "★ Flagship Series",
    "hero.seriesName": "Force™ Cast Series",
    "hero.floatingCardTitle": "Force™ Hand Stretch Film",
    "hero.filmGauge": "Film Gauge",
    "hero.gaugeValue": "60 Gauge",
    "hero.width": "Width",
    "hero.widthValue": "18\" Manual",
    "hero.application": "Application",
    "hero.appValue": "Manual Pallet Hold",
    "hero.startingAt": "Starting At",
    "hero.priceValue": "$20.71 / Box",
    "hero.readyToShip": "Ready to ship by case or pallet",
    "hero.viewMatrix": "View Matrix",

    // Direct key aliases for hero
    "badge": "Engineered for Maximum Pallet Load Containment",
    "titlePart1": "Industrial Strength.",
    "titlePart2": "Precision Stretch Film.",
    "description": "Plastipac USA manufactures high-performance cast stretch films engineered with multi-layer nano-technology. Cut film consumption by up to 40% while locking pallets down with zero freight damage.",
    "exploreBtn": "Explore Product Catalog",
    "quoteBtn": "Request Wholesale Quote",
    "badgePreStretch": "Up to 300%+ Pre-stretch yield",
    "badgePuncture": "Extreme Puncture Hold Multi-layer cast strength",
    "badgeFactory": "Factory Direct Truckload pricing",
    "floatingCardTitle": "Force™ Hand Stretch Film",
    "filmGauge": "Film Gauge",
    "width": "Width",
    "application": "Application",
    "startingAt": "Starting At",
    "viewMatrix": "View Matrix",
    "readyToShip": "Ready to ship by case or pallet",
  },
} as const;

export const getStatusLabel = (status: string, _lang?: Locale) => {
  const labels: Record<string, string> = {
    fulfilled: "Fulfilled",
    delivered: "Delivered",
    in_transit: "In Transit",
    pending: "Pending Payment",
    unfulfilled: "Unfulfilled",
    shipped: "Shipped",
    cancelled: "Cancelled",
    refunded: "Refunded",
    paid: "Paid",
  };

  return labels[status] || status;
};

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  locale: Locale;
  language: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
  isSpanish: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "plastipac_locale";
const COOKIE_NAME = "NEXT_LOCALE";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale: Locale = "en";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "en");
      document.cookie = `${COOKIE_NAME}=en; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = "en";
    } catch {
      // Ignore persistence errors
    }
  }, []);

  const setLocale = useCallback((_newLocale: Locale) => {
    // English is the only supported interface language.
  }, []);

  const toggleLocale = useCallback(() => {
    // English is the only supported interface language.
  }, []);

  const t = useCallback(
    (key: TranslationKey | string, fallback?: string): string => {
      const defaultDict = translations.en as Record<string, string>;
      return defaultDict[key] || fallback || key;
    },
    []
  );

  const value = useMemo(
    () => ({
      locale,
      language: locale,
      setLocale,
      toggleLocale,
      t,
      isSpanish: false,
    }),
    [setLocale, toggleLocale, t]
  );

  return (
    <LanguageContext.Provider value={value}>
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
      language: "en" as Locale,
      setLocale: () => {},
      toggleLocale: () => {},
      t: (key: string, fallback?: string) => fallback || key,
      isSpanish: false,
    };
  }
  return context;
}

