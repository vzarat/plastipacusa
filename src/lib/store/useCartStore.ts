import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types";
import type { AppliedCoupon } from "@/types/coupon";
import { totalsFromCartLines, type PricedCheckoutLine } from "@/lib/checkout-pricing";
import { clampCartQuantity, type CartPackageInput } from "@/lib/cart-quantity";
import { boxTierPricesFromVariants, repriceHandCartLine, totalForBoxes } from "@/lib/pricing";
import { toast } from "sonner";

function pricedLineFromCart(item: CartItem): PricedCheckoutLine {
  return {
    sku: item.sku,
    quantity: item.quantity,
    productName: item.productName,
    productSlug: item.productSlug,
    application: item.application === "machine" ? "machine" : "hand",
    totalBoxes: Math.floor(Number(item.totalBoxes) || 0),
    boxes: Math.floor(Number(item.totalBoxes) || 0) * Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    boxUnitPrice: item.boxUnitPrice ?? null,
    widthInches: item.widthInches,
    gauge: item.gauge,
  };
}

function machinePackageRolls(item: { application?: string; rollsPerBox?: number }): number {
  if (item.application !== "machine") return 0;
  const rolls = Number(item.rollsPerBox) || 0;
  return rolls === 20 || rolls === 40 ? rolls : 0;
}

function applyPackageQuantity<T extends CartPackageInput>(
  item: T,
  requested: number
): { quantity: number; notice: string | null } {
  return clampCartQuantity(item, requested);
}

function notifyQuantityLimit(notice: string | null) {
  if (!notice || typeof window === "undefined") return;
  console.warn(notice);
  toast.error(notice);
}

function lineMoney<T extends CartPackageInput & { unitPrice: number; boxUnitPrice?: number | null }>(
  item: T,
  quantity: number
): { unitPrice: number; boxUnitPrice?: number; totalPrice: number } {
  const perPackage = Math.floor(Number(item.totalBoxes) || 0);
  const storedBoxUnit = Number(item.boxUnitPrice);
  const packageUnit = Number(item.unitPrice);
  const boxUnit =
    perPackage > 1 &&
    storedBoxUnit > 0 &&
    packageUnit > 0 &&
    Math.abs(storedBoxUnit - packageUnit) < 0.02
      ? Math.round((storedBoxUnit / perPackage) * 100) / 100
      : storedBoxUnit;
  if (item.application !== "machine" && perPackage > 0 && boxUnit > 0) {
    return {
      unitPrice: totalForBoxes(boxUnit, perPackage),
      boxUnitPrice: boxUnit,
      totalPrice: totalForBoxes(boxUnit, perPackage * quantity),
    };
  }
  return {
    unitPrice: item.unitPrice,
    totalPrice: Number((quantity * item.unitPrice).toFixed(2)),
  };
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  appliedCoupon: AppliedCoupon | null;
  addItem: (item: Omit<CartItem, "id" | "totalPrice">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  increaseQuantity: (id: string) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  applyCatalogPrices: (
    products: Array<{
      slug?: string;
      packageOptions?: Array<{ sku?: string; price?: number }>;
      variants?: Array<{
        sku?: string;
        price?: number | string | null;
        boxes_count?: number | null;
        boxesCount?: number | null;
      }>;
    }>
  ) => void;
  clearCoupon: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getDiscountedTotal: () => number;
  getTotalWeight: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      appliedCoupon: null,

      addItem: (itemData) => {
        if ((itemData as { isSoldOut?: boolean }).isSoldOut) return;
        const id = `${itemData.productId}-${itemData.variantId}-${itemData.pricingTier}`;
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((item) => item.id === id);

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          const existingItem = updatedItems[existingIndex];
          const clamped = applyPackageQuantity(
            existingItem,
            existingItem.quantity + itemData.quantity
          );
          notifyQuantityLimit(clamped.notice);
          const newQty = clamped.quantity;
          const packageRolls = machinePackageRolls(existingItem);
          const priced = lineMoney(
            {
              ...existingItem,
              boxUnitPrice: itemData.boxUnitPrice ?? existingItem.boxUnitPrice,
              totalBoxes: itemData.totalBoxes ?? existingItem.totalBoxes,
              application: itemData.application || existingItem.application,
              unitPrice: itemData.unitPrice,
            },
            newQty
          );
          updatedItems[existingIndex] = {
            ...existingItem,
            tierType: itemData.tierType || existingItem.tierType,
            boxUnitPrice: priced.boxUnitPrice ?? itemData.boxUnitPrice ?? existingItem.boxUnitPrice,
            quantity: newQty,
            totalRolls: packageRolls > 0 ? packageRolls * newQty : existingItem.totalRolls,
            unitPrice: priced.unitPrice,
            totalPrice: priced.totalPrice,
          };
          set({ items: updatedItems, isDrawerOpen: true });
        } else {
          const clamped = applyPackageQuantity(itemData, itemData.quantity);
          notifyQuantityLimit(clamped.notice);
          const quantity = clamped.quantity;
          const packageRolls = machinePackageRolls(itemData);
          const priced = lineMoney(itemData, quantity);
          const newItem: CartItem = {
            ...itemData,
            quantity,
            totalRolls: packageRolls > 0 ? packageRolls * quantity : itemData.totalRolls,
            id,
            unitPrice: priced.unitPrice,
            boxUnitPrice: priced.boxUnitPrice ?? itemData.boxUnitPrice,
            totalPrice: priced.totalPrice,
          };
          set({ items: [...currentItems, newItem], isDrawerOpen: true });
        }
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        const current = get().items.find((item) => item.id === id);
        if (!current) return;
        const clamped = applyPackageQuantity(current, quantity);
        notifyQuantityLimit(clamped.notice);
        const nextQty = clamped.quantity;
        const packageRolls = machinePackageRolls(current);
        const priced = lineMoney(current, nextQty);

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) return item;
            return {
              ...item,
              quantity: nextQty,
              totalRolls: packageRolls > 0 ? packageRolls * nextQty : item.totalRolls,
              unitPrice: priced.unitPrice,
              boxUnitPrice: priced.boxUnitPrice ?? item.boxUnitPrice,
              totalPrice: priced.totalPrice,
            };
          }),
        }));
      },

      increaseQuantity: (id) => {
        const current = get().items.find((item) => item.id === id);
        if (!current) return;
        get().updateQuantity(id, current.quantity + 1);
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null });
      },

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      applyCatalogPrices: (products) => {
        const priceBySku = new Map<string, number>();
        const boxPricesBySlug = new Map<string, ReturnType<typeof boxTierPricesFromVariants>>();
        for (const product of products) {
          if (product.slug) {
            boxPricesBySlug.set(product.slug, boxTierPricesFromVariants(product.variants));
          }
          for (const option of product.packageOptions || []) {
            const sku = String(option.sku || "");
            const price = Number(option.price);
            if (sku && Number.isFinite(price) && price > 0) priceBySku.set(sku, price);
          }
          for (const variant of product.variants || []) {
            const sku = String(variant.sku || "");
            const price = Number(variant.price);
            if (sku && Number.isFinite(price) && price > 0 && !priceBySku.has(sku)) {
              priceBySku.set(sku, price);
            }
          }
        }
        set((state) => {
          let changed = false;
          const items = state.items.map((item) => {
            if (item.application !== "machine") {
              const next = repriceHandCartLine(item, boxPricesBySlug.get(item.productSlug));
              if (next !== item) changed = true;
              return next;
            }
            const nextPrice = priceBySku.get(item.sku);
            if (nextPrice == null || nextPrice === item.unitPrice) return item;
            changed = true;
            return {
              ...item,
              unitPrice: nextPrice,
              totalPrice: Number((nextPrice * item.quantity).toFixed(2)),
            };
          });
          return changed ? { items } : state;
        });
      },
      clearCoupon: () => set({ appliedCoupon: null }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return totalsFromCartLines(
          get().items.map(pricedLineFromCart),
          get().appliedCoupon,
          0
        ).subtotal;
      },

      getDiscountAmount: () => {
        return totalsFromCartLines(
          get().items.map(pricedLineFromCart),
          get().appliedCoupon,
          0
        ).discount;
      },

      getDiscountedTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        return Number(Math.max(0, subtotal - discount).toFixed(2));
      },

      getTotalWeight: () => {
        return Number(
          get()
            .items.reduce((total, item) => {
              const weightPerUnit = parseFloat(item.weightLbs) || 0;
              return total + weightPerUnit * item.quantity;
            }, 0)
            .toFixed(1)
        );
      },
    }),
    {
      name: "plastipac-cart-storage",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        items: state.items,
        appliedCoupon: state.appliedCoupon,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.items?.length) return;
        const items = state.items.map((item) => {
          const clamped = applyPackageQuantity(item, item.quantity);
          if (clamped.quantity === item.quantity) return item;
          const packageRolls = machinePackageRolls(item);
          const priced = lineMoney(item, clamped.quantity);
          return {
            ...item,
            quantity: clamped.quantity,
            totalRolls:
              packageRolls > 0 ? packageRolls * clamped.quantity : item.totalRolls,
            unitPrice: priced.unitPrice,
            boxUnitPrice: priced.boxUnitPrice ?? item.boxUnitPrice,
            totalPrice: priced.totalPrice,
          };
        });
        if (items.some((item, index) => item !== state.items[index])) {
          queueMicrotask(() => {
            useCartStore.setState({ items });
          });
        }
      },
    }
  )
);
