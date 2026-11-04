"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type RegisteredProduct = {
  productId: string;
  pathname: string;
};

type FeedbackProductContextValue = {
  productId: string | null;
  registerProduct: (productId: string, pathname: string) => void;
  clearProduct: (productId: string, pathname: string) => void;
};

const FeedbackProductContext =
  createContext<FeedbackProductContextValue | null>(null);

export function FeedbackProductProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const [registeredProduct, setRegisteredProduct] =
    useState<RegisteredProduct | null>(null);

  const registerProduct = useCallback(
  (productId: string, pathname: string) => {
    setRegisteredProduct((current) => {
      if (
        current?.productId === productId &&
        current.pathname === pathname
      ) {
        return current;
      }

      return { productId, pathname };
    });
  },
  []
);

  const clearProduct = useCallback(
  (productId: string, pathname: string) => {
    setRegisteredProduct((current) => {
      if (
        current?.productId === productId &&
        current.pathname === pathname
      ) {
        return null;
      }

      return current;
    });
  },
  []
);

  const productId =
    registeredProduct?.pathname === pathname
      ? registeredProduct.productId
      : null;

  return (
    <FeedbackProductContext.Provider
      value={{
        productId,
        registerProduct,
        clearProduct,
      }}
    >
      {children}
    </FeedbackProductContext.Provider>
  );
}

export function useFeedbackProduct() {
  const context = useContext(FeedbackProductContext);

  if (!context) {
    throw new Error(
      "useFeedbackProduct must be used within FeedbackProductProvider"
    );
  }

  return context;
}