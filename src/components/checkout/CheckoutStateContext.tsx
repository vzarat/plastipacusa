"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { SavedShippingAddress } from "@/lib/saved-shipping-address";
import type { DeliveryMethodId } from "@/lib/shipping-method";

interface CheckoutStateValue {
  selectedAddress: SavedShippingAddress | null;
  setSelectedAddress: Dispatch<SetStateAction<SavedShippingAddress | null>>;
  deliveryMethod: DeliveryMethodId;
  setDeliveryMethod: Dispatch<SetStateAction<DeliveryMethodId>>;
  taxExemptRequested: boolean;
  setTaxExemptRequested: Dispatch<SetStateAction<boolean>>;
}

const CheckoutStateContext = createContext<CheckoutStateValue | null>(null);

export function CheckoutStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedAddress, setSelectedAddress] =
    useState<SavedShippingAddress | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodId>("ground");
  const [taxExemptRequested, setTaxExemptRequested] = useState(false);

  const value = useMemo(
    () => ({
      selectedAddress,
      setSelectedAddress,
      deliveryMethod,
      setDeliveryMethod,
      taxExemptRequested,
      setTaxExemptRequested,
    }),
    [selectedAddress, deliveryMethod, taxExemptRequested]
  );

  return (
    <CheckoutStateContext.Provider value={value}>
      {children}
    </CheckoutStateContext.Provider>
  );
}

export function useCheckoutState() {
  const context = useContext(CheckoutStateContext);
  if (!context) {
    throw new Error("useCheckoutState must be used within CheckoutStateProvider");
  }
  return context;
}
