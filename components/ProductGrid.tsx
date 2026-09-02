"use client";

// C:\Users\Asiya\projects\dalra\components\ProductGrid.tsx
// CHANGED: card image/title now links to /b/[brandSlug]/p/[productSlug]
// The "Shop" button still goes to /out/[id] via buildTrackedUrl (unchanged)


import Image from "next/image";
import Link from "next/link";
import MoneyLabel from "@/components/MoneyLabel";
import ProductClickTrackingLink from "@/components/analytics/ProductClickTrackingLink";
import WishlistButton from "@/components/WishlistButton";
import ProductImpressionTracker from "@/components/analytics/ProductImpressionTracker";
import type {  DiscoverySource,} from "@/lib/analytics/discoverySource";


export type GridProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  brandName?: string | null;
  brandSlug?: string | null; // ← ADD THIS to your data fetch
  productSlug?: string | null; // ← ADD THIS to your data fetch
  price: string | null;
  currency: string;
  priceLabel?: string | null;
  buyUrl: string | null;
  badges?: string[];

  analytics?: {
  sourcePage?: DiscoverySource;

  sectionId?: string | null;
  sectionKey?: string | null;
  position?: number | null;
  pageNumber?: number | null;
  isExpandedPageOne?: boolean | null;
  contextType?: string | null;
  searchQuery?: string | null;
};
};

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-white/90 border border-black/10 px-2 py-1 text-[10px] font-semibold tracking-wider">
      {children}
    </span>
  );
}

function buildTrackedUrl(product: GridProduct, fallbackIndex: number) {
  const params = new URLSearchParams();

  const sourcePage =  product.analytics?.sourcePage ?? "OTHER";
  const sectionId = product.analytics?.sectionId ?? null;
  const sectionKey = product.analytics?.sectionKey ?? "grid";
  const position = product.analytics?.position ?? fallbackIndex + 1;
  const pageNumber = product.analytics?.pageNumber ?? 1;
  const isExpandedPageOne = product.analytics?.isExpandedPageOne ?? false;
  const contextType = product.analytics?.contextType ?? "GRID";
  const searchQuery =  product.analytics?.searchQuery ?? null;

  params.set("src", sourcePage);
  params.set("skey", sectionKey);
  params.set("pos", String(position));
  params.set("page", String(pageNumber));
  params.set("expanded", isExpandedPageOne ? "1" : "0");
  params.set("ctx", contextType);

  if (searchQuery) {
  params.set("q", searchQuery);
}

  if (sectionId) {
    params.set("sid", sectionId);
  }

  return `/out/${product.id}?${params.toString()}`;
}

export function ProductGrid({ products }: { products: GridProduct[] }) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
      {products.map((p, index) => {
        const outHref = buildTrackedUrl(p, index);

        const detailHref =
          p.brandSlug && p.productSlug
            ? (() => {
                const base =
                  `/b/${p.brandSlug}/p/${p.productSlug}`;

                const params = new URLSearchParams();

                if (p.analytics?.sourcePage) {
                  params.set(
                    "src",
                    p.analytics.sourcePage
                  );
                }

                if (p.analytics?.searchQuery) {
                  params.set(
                    "q",
                    p.analytics.searchQuery
                  );
                }

                const position =
                  p.analytics?.position ??
                  index + 1;

                params.set(
                  "pos",
                  String(position)
                );

                if (p.analytics?.sectionKey) {
  params.set(
    "skey",
    p.analytics.sectionKey
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

                const qs = params.toString();

                return qs
                  ? `${base}?${qs}`
                  : base;
              })()
            : null;

        return (
          <ProductImpressionTracker
  key={p.id}
  productId={p.id}
  sourcePage={
    p.analytics?.sourcePage
  }
  sectionKey={
    p.analytics?.sectionKey
  }
  position={
    p.analytics?.position ??
    index + 1
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
          >
            
            <div className="overflow-hidden rounded-3xl border border-black/5 bg-white transition hover:shadow-sm">
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
                  ) : (
                    <ProductClickTrackingLink
                      href={outHref}
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
                  )
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-xs text-black/40">
                    No image
                  </div>
                )}

                <div className="absolute right-3 top-3">
                  <WishlistButton
  productId={p.id}
  analytics={{
    sourcePage:
      p.analytics?.sourcePage,

    searchQuery:
      p.analytics?.searchQuery,

    position:
      p.analytics?.position ??
      index + 1,

    sectionKey:
      p.analytics?.sectionKey,

    pageNumber:
      p.analytics?.pageNumber,

    contextType:
      p.analytics?.contextType,
  }}
/>
                </div>

                {p.badges?.includes("sale") ? (
                  <div className="absolute left-3 top-3 flex flex-col gap-2">
                    <BadgePill>
                      SALE
                    </BadgePill>
                  </div>
                ) : null}
              </div>

              <div className="p-4">
                {detailHref ? (
                  <Link href={detailHref}>
                    <div className="line-clamp-2 text-sm font-medium leading-5 hover:underline">
                      {p.title}
                    </div>
                  </Link>
                ) : (
                  <ProductClickTrackingLink
                    href={outHref}
                    productId={p.id}
                    productName={p.title}
                    brandName={p.brandName}
                  >
                    <div className="line-clamp-2 text-sm font-medium leading-5 hover:underline">
                      {p.title}
                    </div>
                  </ProductClickTrackingLink>
                )}

                {p.brandName ? (
                  <div className="mt-1 text-xs uppercase tracking-wide text-black/60">
                    {p.brandName}
                  </div>
                ) : null}

                <div className="mt-2 text-sm text-black/70">
                  <MoneyLabel
                    amount={p.price}
                    currency={p.currency}
                  />
                </div>

                <ProductClickTrackingLink
                  href={outHref}
                  productId={p.id}
                  productName={p.title}
                  brandName={p.brandName}
                  className="mt-3 inline-flex items-center rounded-full bg-black px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  Shop
                </ProductClickTrackingLink>
              </div>
            </div>
          </ProductImpressionTracker>
        );
      })}
    </div>
  );
}