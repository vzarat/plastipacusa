"use client";

import { CART_CONTACT_STORAGE, CART_GUEST_KEY_STORAGE } from "./config";
import type { CartSessionContact } from "./types";

function randomGuestKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateCartGuestKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(CART_GUEST_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const next = randomGuestKey();
    window.localStorage.setItem(CART_GUEST_KEY_STORAGE, next);
    return next;
  } catch {
    return "";
  }
}

export function readStoredCartContact(): CartSessionContact {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CART_CONTACT_STORAGE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CartSessionContact;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeStoredCartContact(contact: CartSessionContact): void {
  if (typeof window === "undefined") return;
  try {
    const prev = readStoredCartContact();
    const next: CartSessionContact = {
      email: contact.email ?? prev.email,
      companyName: contact.companyName ?? prev.companyName,
      contactName: contact.contactName ?? prev.contactName,
      phone: contact.phone ?? prev.phone,
      shippingZip: contact.shippingZip ?? prev.shippingZip,
      shippingCity: contact.shippingCity ?? prev.shippingCity,
      shippingState: contact.shippingState ?? prev.shippingState,
    };
    window.localStorage.setItem(CART_CONTACT_STORAGE, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export function cartContactIsIdentifiable(contact: CartSessionContact): boolean {
  const zip = String(contact.shippingZip || "").match(/\d{5}/)?.[0];
  const email = String(contact.email || "").trim();
  const phone = String(contact.phone || "").trim();
  const name = String(contact.contactName || "").trim();
  return Boolean(zip || email || phone || name);
}
