"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useShopperCurrency } from "@/hooks/useShopperCurrency";

type Shopper = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

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
  rawTotal: number;       // sum in original currencies (for conversion)
  itemTotals: { amount: number; currency: string }[]; // per-item for accurate conversion
  currency: string;
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
        rawTotal: 0,
        itemTotals: [],
        currency: item.currency || "GBP",
      });
    }
    const group = map.get(key)!;
    group.items.push(item);
    const price = parseFloat(item.price ?? "0");
    if (!isNaN(price)) {
      group.itemTotals.push({ amount: price, currency: item.currency });
    }
  }
  return Array.from(map.values());
}

export default function AccountPage() {
  const [shopper, setShopper] = useState<Shopper | null>(null);
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { currency, convertPrice, convertAmount, formatPrice } = useShopperCurrency();

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/account/auth/me", { credentials: "include" });
      if (!meRes.ok) { router.replace("/account/login"); return; }
      const { shopper } = await meRes.json();
      setShopper(shopper);
      const wRes = await fetch("/api/account/wishlist/items", { credentials: "include" });
      if (wRes.ok) {
        const data = await wRes.json();
        setWishlist(data.items ?? []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/account/auth/logout", { method: "POST", credentials: "include" });
    window.location.assign("/");
  }

  async function removeFromWishlist(productId: string) {
    setWishlist((prev) => prev.filter((i) => i.productId !== productId));
    await fetch(`/api/account/wishlist/${productId}`, { method: "DELETE", credentials: "include" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center">
        <div className="text-sm text-[#a89280] tracking-wide">Loading...</div>
      </div>
    );
  }

  if (!shopper) return null;

  const brandGroups = groupByBrand(wishlist);

  // Grand total: convert each item individually then sum
  const grandTotal = wishlist.reduce((sum, item) => {
    const num = parseFloat(item.price ?? "0");
    if (isNaN(num)) return sum;
    return sum + convertAmount(num, item.currency);
  }, 0);

  return (
    <div className="min-h-screen bg-[#faf8f4] font-body">
      <div className="bg-[#7B2D3E] px-8 py-6 text-center">
        <a href="/" className="font-heading text-2xl tracking-[0.08em] text-white hover:opacity-80">
          Veilora Club
        </a>
        <div className="mt-1 text-[11px] uppercase tracking-[0.25em] text-white/50">My Account</div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Welcome row */}
        <div className="mb-10 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#7B2D3E]">My Account</p>
            <h1 className="mt-2 font-heading text-3xl text-[#1a0a0e]">
              Welcome back{shopper.firstName ? `, ${shopper.firstName}` : ""}.
            </h1>
            <p className="mt-1 text-sm text-[#a89280]">{shopper.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 text-xs text-[#a89280] underline underline-offset-4 hover:text-[#7B2D3E] transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Stats row */}
        <div className="mb-10 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#e8ddd4] bg-white p-5 text-center">
            <p className="font-heading text-2xl text-[#1a0a0e]">{wishlist.length}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#a89280]">Saved pieces</p>
          </div>
          <div className="rounded-xl border border-[#e8ddd4] bg-white p-5 text-center">
            <p className="font-heading text-2xl text-[#1a0a0e]">{brandGroups.length}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#a89280]">Brands</p>
          </div>
          <div className="rounded-xl border border-[#e8ddd4] bg-white p-5 text-center">
            <p className="font-heading text-2xl text-[#1a0a0e]">
              {wishlist.length > 0 ? formatPrice(grandTotal) : "—"}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#a89280]">
              Wishlist value · {currency}
            </p>
          </div>
        </div>

        {/* Wishlist section */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-xl text-[#1a0a0e]">My Wishlist</h2>
          {wishlist.length > 0 && (
            <a href="/account/wishlist" className="text-xs text-[#7B2D3E] underline underline-offset-4 hover:opacity-70">
              View all
            </a>
          )}
        </div>

        {wishlist.length === 0 ? (
          <div className="rounded-2xl border border-[#e8ddd4] bg-white p-10 text-center">
            <div className="text-3xl mb-3">♡</div>
            <p className="text-sm text-[#a89280]">No saved pieces yet.</p>
            <a href="/categories/clothing" className="mt-4 inline-flex items-center rounded-full bg-[#7B2D3E] px-5 py-2.5 text-xs text-white hover:bg-[#6a2535] transition">
              Start browsing
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {brandGroups.map((group) => {
              // Brand subtotal: convert each item individually
              const brandTotal = group.itemTotals.reduce((sum, t) => {
                return sum + convertAmount(t.amount, t.currency);
              }, 0);

              return (
                <div key={group.brandSlug} className="rounded-2xl border border-[#e8ddd4] bg-white overflow-hidden">
                  {/* Brand header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8e0]">
                    <button
                      onClick={() => {
                        group.items.forEach((item, i) => {
                          setTimeout(() => {
                            window.open(`/out/${item.productId}?src=SEARCH&skey=wishlist&ctx=WISHLIST`, "_blank");
                          }, i * 300);
                        });
                      }}
                      className="font-heading text-base text-[#1a0a0e] hover:text-[#7B2D3E] transition-colors text-left"
                    >
                      {group.brandName}
                    </button>
                    <div className="text-right">
                      <p className="text-xs text-[#a89280]">
                        {group.items.length} {group.items.length === 1 ? "piece" : "pieces"}
                      </p>
                      {brandTotal > 0 && (
                        <p className="text-sm font-medium text-[#1a0a0e]">
                          {formatPrice(brandTotal)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Product list */}
                  <div className="divide-y divide-[#f0e8e0]">
                    {group.items.map((item) => {
                      const detailHref = `/b/${item.brandSlug}/p/${item.productSlug}`;
                      return (
                        <div key={item.productId} className="flex items-center gap-4 px-5 py-4">
                          <Link href={detailHref} className="shrink-0">
                            <div className="relative h-16 w-12 overflow-hidden rounded-lg bg-black/5">
                              {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="48px" />
                              ) : (
                                <div className="absolute inset-0 grid place-items-center text-[10px] text-black/30">No img</div>
                              )}
                            </div>
                          </Link>

                          <div className="flex-1 min-w-0">
                            <Link href={detailHref} className="line-clamp-2 text-sm font-medium text-[#1a0a0e] hover:text-[#7B2D3E] transition-colors">
                              {item.title}
                            </Link>
                            {item.price && (
                              <p className="mt-1 text-sm text-[#6b5c4e]">
                                {convertPrice(item.price, item.currency)}
                              </p>
                            )}
                          </div>

                          <a
                            href={`/out/${item.productId}?src=SEARCH&skey=wishlist&ctx=WISHLIST`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded-full bg-black px-3 py-1.5 text-[11px] font-medium text-white hover:opacity-80 transition"
                          >
                            Shop ↗
                          </a>

                          <button
                            onClick={() => removeFromWishlist(item.productId)}
                            className="shrink-0 text-[#d8c9b5] hover:text-[#7B2D3E] transition-colors"
                            aria-label="Remove from wishlist"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Brand footer */}
                  <div className="px-5 py-3 bg-[#faf8f4] border-t border-[#f0e8e0]">
                    <button
                      onClick={() => {
                        group.items.forEach((item, i) => {
                          setTimeout(() => {
                            window.open(`/out/${item.productId}?src=SEARCH&skey=wishlist&ctx=WISHLIST`, "_blank");
                          }, i * 300);
                        });
                      }}
                      className="text-xs text-[#7B2D3E] hover:underline underline-offset-4"
                    >
                      Shop all from {group.brandName} ({group.items.length} {group.items.length === 1 ? "piece" : "pieces"}) ↗
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Grand total */}
            {grandTotal > 0 && (
              <div className="rounded-2xl border border-[#7B2D3E]/20 bg-[#7B2D3E]/5 px-6 py-4 flex items-center justify-between">
                <p className="text-sm text-[#6b5c4e]">
                  Total wishlist value <span className="text-[#a89280]">({wishlist.length} pieces · {currency})</span>
                </p>
                <p className="font-heading text-xl text-[#7B2D3E]">
                  {formatPrice(grandTotal)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Orders placeholder */}
        <div className="mt-8 rounded-2xl border border-[#e8ddd4] bg-white p-6 opacity-50">
          <div className="flex items-center gap-3">
            <span className="text-xl">📦</span>
            <div>
              <h3 className="font-heading text-base text-[#1a0a0e]">Orders</h3>
              <p className="text-xs text-[#a89280]">Coming soon.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-6 text-center text-[11px] tracking-[0.12em] text-[#7B2D3E]/40">
        © {new Date().getFullYear()} Veilora Club
      </div>
    </div>
  );
}
