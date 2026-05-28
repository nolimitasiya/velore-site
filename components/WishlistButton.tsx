// C:\Users\Asiya\projects\dalra\components\WishlistButton.tsx
"use client";

import { useState } from "react";

export default function WishlistButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [wished, setWished] = useState(false);

  return (
    <button
      type="button"
      aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setWished((v) => !v);

        // Fire GA event
        if (typeof window !== "undefined" && window.gtag) {
          window.gtag("event", wished ? "wishlist_remove" : "wishlist_add", {
            product_id: productId,
            product_name: productName,
          });
        }
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/90 transition hover:bg-white"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill={wished ? "#D4537E" : "none"}
        stroke={wished ? "#D4537E" : "currentColor"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
