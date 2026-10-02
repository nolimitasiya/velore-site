"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import WishlistButton from "@/components/WishlistButton";
import { useShopperCurrency } from "@/hooks/useShopperCurrency";

type WishlistProduct = {
  productId: string;
  title: string;
  brandName: string;
  brandSlug: string;
  brandWebsiteUrl: string | null;
  productSlug: string;
  imageUrl: string | null;
  price: string | null;
  currency: string;
};

type BrandGroup = {
  brandName: string;
  brandSlug: string;
  brandWebsiteUrl: string | null;
  items: WishlistProduct[];
  itemTotals: { amount: number; currency: string }[];
};

function groupByBrand(items: WishlistProduct[]): BrandGroup[] {
  const map = new Map<string, BrandGroup>();
  for (const item of items) {
    const key = item.brandSlug;
    if (!map.has(key)) {
      map.set(key, {
        brandName: item.brandName,
        brandSlug: item.brandSlug,
        brandWebsiteUrl: item.brandWebsiteUrl,
        items: [],
        itemTotals: [],
      });
    }
    const group = map.get(key)!;
    group.items.push(item);
    const price = parseFloat(item.price ?? "0");
    if (!isNaN(price)) group.itemTotals.push({ amount: price, currency: item.currency });
  }
  return Array.from(map.values());
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { currency, convertPrice, convertAmount, formatPrice } = useShopperCurrency();

  useEffect(() => {
    async function load() {
      const response = await fetch(
       "/api/account/wishlist/items",
       {
         credentials: "include",
       }
     );

    if (response.ok) {
      const data = await response.json();
      setWishlist(data.items ?? []);
    }

    setLoading(false);
  }

  load();
}, []);

  async function removeFromWishlist(productId: string) {
    setWishlist((prev) => prev.filter((i) => i.productId !== productId));
    await fetch(`/api/account/wishlist/${productId}`, { method: "DELETE", credentials: "include" });
  }

  if (loading) {
  return (
    <div className="py-24 text-center text-sm tracking-wide text-[#a89280]">
      Loading your wishlist...
    </div>
  );
}

  const brandGroups = groupByBrand(wishlist);
  const grandTotal = wishlist.reduce((sum, item) => {
    const num = parseFloat(item.price ?? "0");
    if (isNaN(num)) return sum;
    return sum + convertAmount(num, item.currency);
  }, 0);


      return (
  <div>
    <div className="mb-8">
      <h1 className="mt-2 font-heading text-3xl text-[#1a0a0e]">
        My Wishlist
      </h1>

      {wishlist.length > 0 && (
        <p className="mt-1 text-sm text-[#a89280]">
          {wishlist.length}{" "}
          {wishlist.length === 1
            ? "piece"
            : "pieces"}{" "}
          · {brandGroups.length}{" "}
          {brandGroups.length === 1
            ? "brand"
            : "brands"}{" "}
          · {currency}
        </p>
      )}
    </div>

    {wishlist.length === 0 ? (
      <div className="rounded-2xl border border-[#e8ddd4] bg-white p-12 text-center">
        <div className="mb-4 text-4xl">
          ♡
        </div>

        <h2 className="font-heading text-xl text-[#1a0a0e]">
          Your wishlist is empty
        </h2>

        <p className="mt-2 text-sm text-[#a89280]">
          Save pieces you love by tapping the
          heart on any product.
        </p>

        <a
          href="/categories/clothing"
          className="mt-6 inline-flex items-center rounded-full bg-[#7B2D3E] px-6 py-3 text-sm text-white transition hover:bg-[#6a2535]"
        >
          Start browsing
        </a>
      </div>
    ) : (
      <div className="space-y-6">
        {brandGroups.map((group) => {
          const brandTotal =
            group.itemTotals.reduce(
              (sum, item) =>
                sum +
                convertAmount(
                  item.amount,
                  item.currency
                ),
              0
            );

          return (
            <div
              key={group.brandSlug}
              className="overflow-hidden rounded-2xl border border-[#e8ddd4] bg-white"
            >
              <div className="flex items-center justify-between border-b border-[#f0e8e0] px-5 py-4">
                <button
                  type="button"
                  onClick={() =>
                    group.items.forEach(
                      (item, index) =>
                        setTimeout(() => {
                          window.open(
                            `/out/${item.productId}?src=SEARCH&skey=wishlist&ctx=WISHLIST`,
                            "_blank"
                          );
                        }, index * 300)
                    )
                  }
                  className="text-left font-heading text-base text-[#1a0a0e] transition-colors hover:text-[#7B2D3E]"
                >
                  {group.brandName}
                </button>

                <div className="text-right">
                  <p className="text-xs text-[#a89280]">
                    {group.items.length}{" "}
                    {group.items.length === 1
                      ? "piece"
                      : "pieces"}
                  </p>

                  {brandTotal > 0 && (
                    <p className="text-sm font-medium text-[#1a0a0e]">
                      {formatPrice(brandTotal)}
                    </p>
                  )}
                </div>
              </div>

              <div className="divide-y divide-[#f0e8e0]">
                {group.items.map((item) => {
                  const detailHref =
                    `/b/${item.brandSlug}/p/${item.productSlug}`;

                  return (
                    <div
                      key={item.productId}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <Link
                        href={detailHref}
                        className="shrink-0"
                      >
                        <div className="relative h-16 w-12 overflow-hidden rounded-lg bg-black/5">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-[10px] text-black/30">
                              No img
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={detailHref}
                          className="line-clamp-2 text-sm font-medium text-[#1a0a0e] transition-colors hover:text-[#7B2D3E]"
                        >
                          {item.title}
                        </Link>

                        {item.price && (
                          <p className="mt-1 text-sm text-[#6b5c4e]">
                            {convertPrice(
                              item.price,
                              item.currency
                            )}
                          </p>
                        )}
                      </div>

                      <WishlistButton
                        productId={item.productId}
                      />

                      <a
                        href={`/out/${item.productId}?src=SEARCH&skey=wishlist&ctx=WISHLIST`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-full bg-black px-3 py-1.5 text-[11px] font-medium text-white transition hover:opacity-80"
                      >
                        Shop ↗
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          removeFromWishlist(
                            item.productId
                          )
                        }
                        className="shrink-0 text-[#d8c9b5] transition-colors hover:text-[#7B2D3E]"
                        aria-label="Remove from wishlist"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 fill-current"
                        >
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[#f0e8e0] bg-[#faf8f4] px-5 py-3">
                <button
                  type="button"
                  onClick={() =>
                    group.items.forEach(
                      (item, index) =>
                        setTimeout(() => {
                          window.open(
                            `/out/${item.productId}?src=SEARCH&skey=wishlist&ctx=WISHLIST`,
                            "_blank"
                          );
                        }, index * 300)
                    )
                  }
                  className="text-xs text-[#7B2D3E] underline-offset-4 hover:underline"
                >
                  Shop all from{" "}
                  {group.brandName} (
                  {group.items.length}{" "}
                  {group.items.length === 1
                    ? "piece"
                    : "pieces"}
                  ) ↗
                </button>
              </div>
            </div>
          );
        })}

        {grandTotal > 0 && (
         <div className="rounded-2xl border border-[#e8ddd4] bg-white px-6 py-4 flex items-center justify-between">
           <p className="text-sm text-black">
  Total wishlist value{" "}
  <span>
    ({wishlist.length} pieces ·{" "}
    {currency})
  </span>
</p>

            <p className="font-heading text-xl text-[#1a0a0e]">
              {formatPrice(grandTotal)}
            </p>
          </div>
        )}
      </div>
    )}
  </div>
);
}
