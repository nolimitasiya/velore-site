"use client";
import Image from "next/image";
import Link from "next/link";
import MoneyLabel from "@/components/MoneyLabel";
import ProductClickTrackingLink from "@/components/analytics/ProductClickTrackingLink";
import WishlistButton from "@/components/WishlistButton";
import ProductImpressionTracker from "@/components/analytics/ProductImpressionTracker";

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

  analytics?: {
    discoverySource?: string | null;
    sectionId?: string | null;
    sectionKey?: string | null;
    position?: number | null;
    pageNumber?: number | null;
    contextType?: string | null;
    searchQuery?: string | null;

    entrySectionKey?: string | null;
    entryPosition?: number | null;
    entryPageNumber?: number | null;
    entryContextType?: string | null;
};
};

export function ProductRow({ products }: { products: StorefrontProduct[] }) {
  return (
    <div className="mx-auto w-full max-w-[1800px] px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((p) => {
          const params = new URLSearchParams();

if (p.analytics?.discoverySource) {
  params.set(
    "src",
    p.analytics.discoverySource
  );
}

if (p.analytics?.sectionKey) {
  params.set(
    "skey",
    p.analytics.sectionKey
  );
}

if (p.analytics?.position) {
  params.set(
    "pos",
    String(p.analytics.position)
  );
}

if (p.analytics?.pageNumber) {
  params.set(
    "page",
    String(p.analytics.pageNumber)
  );
}

if (p.analytics?.contextType) {
  params.set(
    "ctx",
    p.analytics.contextType
  );
}

if (p.analytics?.searchQuery) {
  params.set(
    "q",
    p.analytics.searchQuery
  );
}

if (p.analytics?.entrySectionKey) {
  params.set(
    "entry_skey",
    p.analytics.entrySectionKey
  );
}

if (
  typeof p.analytics?.entryPosition === "number"
) {
  params.set(
    "entry_pos",
    String(p.analytics.entryPosition)
  );
}

if (
  typeof p.analytics?.entryPageNumber === "number"
) {
  params.set(
    "entry_page",
    String(p.analytics.entryPageNumber)
  );
}

if (p.analytics?.entryContextType) {
  params.set(
    "entry_ctx",
    p.analytics.entryContextType
  );
}

const detailHref =
  p.brandSlug && p.productSlug
    ? `/b/${p.brandSlug}/p/${p.productSlug}${
        params.toString()
          ? `?${params.toString()}`
          : ""
      }`
    : null;
          const href = p.buyUrl?.trim() || null;

          return (
  <ProductImpressionTracker
    key={p.id}
    productId={p.id}
    sourcePage={
      p.analytics?.discoverySource as any
    }
    sectionKey={
      p.analytics?.sectionKey
    }
    position={
      p.analytics?.position
    }
    pageNumber={
      p.analytics?.pageNumber
    }
    contextType={
      p.analytics?.contextType
    }
    searchQuery={
      p.analytics?.searchQuery
    }
    entrySectionKey={
  p.analytics?.entrySectionKey
}
entryPosition={
  p.analytics?.entryPosition
}
entryPageNumber={
  p.analytics?.entryPageNumber
}
entryContextType={
  p.analytics?.entryContextType
}
  >
    <div
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
                  <WishlistButton
  productId={p.id}
  analytics={{
    sourcePage:
      p.analytics?.discoverySource as any,
    searchQuery:
      p.analytics?.searchQuery ?? null,
    position:
      p.analytics?.position ?? null,
    sectionKey:
      p.analytics?.sectionKey ?? null,
    pageNumber:
      p.analytics?.pageNumber ?? null,
    contextType:
      p.analytics?.contextType ?? null,

      entrySectionKey:
  p.analytics?.entrySectionKey ?? null,

entryPosition:
  p.analytics?.entryPosition ?? null,

entryPageNumber:
  p.analytics?.entryPageNumber ?? null,

entryContextType:
  p.analytics?.entryContextType ?? null,

  }}
/>
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
            </ProductImpressionTracker>

          );
        })}
      </div>
    </div>
    
  );
}