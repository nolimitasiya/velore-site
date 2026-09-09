"use client";

import { useEffect, useRef } from "react";

export default function ProductViewTracker({ productId }: { productId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    fetch("/api/clicks/product-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId }),
      keepalive: true,
    }).catch(() => {});
  }, [productId]);

  return null;
}