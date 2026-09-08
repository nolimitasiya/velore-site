import "server-only";

import { revalidateTag } from "next/cache";

export function invalidateStorefrontProduct({
  productId,
  brandSlug,
  productSlug,
  previousProductSlug,
}: {
  productId: string;
  brandSlug: string;
  productSlug: string;
  previousProductSlug?: string | null;
}) {
  // Current product URL/cache
  revalidateTag(
    `product:${brandSlug}:${productSlug}`,
    "max"
  );

  // If the slug changed, also remove the cache
  // associated with the OLD product URL.
  if (
    previousProductSlug &&
    previousProductSlug !== productSlug
  ) {
    revalidateTag(
      `product:${brandSlug}:${previousProductSlug}`,
      "max"
    );
  }

  // Secondary product data such as
  // Complete the Look / Diary relationships.
  revalidateTag(
    `product:${productId}`,
    "max"
  );

  // Anything cached against this brand.
  revalidateTag(
    `brand:${brandSlug}`,
    "max"
  );

  // Broad storefront catalogue data.
  revalidateTag(
    "storefront-products",
    "max"
  );
}