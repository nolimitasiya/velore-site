"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useFeedbackProduct } from "@/components/feedback/FeedbackProductContext";

type Props = {
  productId: string;
};

export default function FeedbackProductRegistration({
  productId,
}: Props) {
  const pathname = usePathname();

  const { registerProduct, clearProduct } = useFeedbackProduct();

  useEffect(() => {
    registerProduct(productId, pathname);

    return () => {
      clearProduct(productId, pathname);
    };
  }, [productId, pathname, registerProduct, clearProduct]);

  return null;
}