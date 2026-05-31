"use client";
import Image from "next/image";
import Link from "next/link";
import MoneyLabel from "@/components/MoneyLabel";
import ProductClickTrackingLink from "@/components/analytics/ProductClickTrackingLink";
import WishlistButton from "@/components/WishlistButton";

export type StorefrontProduct = {
  id: string;
  title: string;
  brandName?: string | null;
  imageUrl: string | null;
  price: string | null;
  currency: string;
  buyUrl: string | null;
  brandSlug?: string | null;
  productSlug?: string | null;
};

export function ProductRow({ products }: { products: StorefrontProduct[] }) {
  return (
    <div className="mx-auto w-full max-w-[1800px] px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((p) => {
          const detailHref =
            p.brandSlug && p.productSlug
              ? `/b/${p.brandSlug}/p/${p.productSlug}`
              : null;
          const href = p.buyUrl?.trim() || null;

          return (
            <div
              key={p.id}
              className="rounded-3xl border border-black/10 bg-white overflow-hidden"
            >
              <div className="relative aspect-[3/4] bg-black/5">
                {p.imageUrl ? (
                  detailHref ? (
                    <Link href={detailHref}>
                      <Image
                        src={p.imageUrl}
                        alt={p.title}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </Link>
                  ) : href ? (
                    <ProductClickTrackingLink
                      href={href}
                      productId={p.id}
                      productName={p.title}
                      brandName={p.brandName}
                    >
                      <Image
                        src={p.imageUrl}
                        alt={p.title}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </ProductClickTrackingLink>
                  ) : (
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  )
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-xs text-black/40">
                    No image
                  </div>
                )}

                {/* Wishlist heart */}
                <div className="absolute right-3 top-3">
                  <WishlistButton productId={p.id} />
                </div>
                
              </div>

              <div className="p-4">
                {detailHref ? (
                  <Link
                    href={detailHref}
                    className="line-clamp-2 text-sm font-medium leading-5 hover:underline"
                  >
                    {p.title}
                  </Link>
                ) : href ? (
                  <ProductClickTrackingLink
                    href={href}
                    productId={p.id}
                    productName={p.title}
                    brandName={p.brandName}
                    className="line-clamp-2 text-sm font-medium leading-5 hover:underline"
                  >
                    {p.title}
                  </ProductClickTrackingLink>
                ) : (
                  <div className="text-sm font-medium line-clamp-2">
                    {p.title}
                  </div>
                )}

                {p.brandName && (
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-black/60">
                    {p.brandName}
                  </div>
                )}

                <div className="mt-2 text-sm text-black/70">
                  <MoneyLabel amount={p.price} currency={p.currency} />
                </div>

                {href && (
                  <ProductClickTrackingLink
                    href={href}
                    productId={p.id}
                    productName={p.title}
                    brandName={p.brandName}
                    className="mt-3 inline-flex items-center rounded-full bg-black px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                  >
                    Shop
                  </ProductClickTrackingLink>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}