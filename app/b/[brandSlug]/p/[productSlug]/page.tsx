// C:\Users\Asiya\projects\dalra\app\b\[brandSlug]\p\[productSlug]\page.tsx
// CHANGES: removed styles/occasions pills, trust block, about brand accordion
//          added brand shipping/returns to shipping accordion

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import MoneyLabel from "@/components/MoneyLabel";
import ProductClickTrackingLink from "@/components/analytics/ProductClickTrackingLink";
import { buildTrackedOutboundUrl } from "@/lib/affiliate/tracking";
import { sortSizes, formatSizeLabel } from "@/lib/sizing/order";
import { BrandAccountStatus, AffiliateStatus } from "@prisma/client";
import ImageGallery from "./ImageGallery";
import Accordion from "./Accordion";

function formatProductTypeLabel(value: string) {
  if (value === "COATS_JACKETS") return "Coats & Jackets";
  if (value === "HOODIE_SWEATSHIRT") return "Hoodie & Sweatshirt";
  if (value === "T_SHIRT") return "T-Shirt";
  return value.toLowerCase().replaceAll("_", " ").split(" ").filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function regionLabel(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatReturnsPaidBy(value: string | null | undefined) {
  if (value === "BUYER") return "Buyer pays return postage";
  if (value === "BRAND") return "Brand covers return postage";
  if (value === "NO_RETURNS") return "No returns accepted";
  return null;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ brandSlug: string; productSlug: string }>;
}) {
  const { brandSlug, productSlug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      slug: productSlug,
      brand: { slug: brandSlug },
      isActive: true,
      publishedAt: { not: null },
      status: "APPROVED",
    },
    include: {
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
          websiteUrl: true,
          instagramHandle: true,
          baseCity: true,
          baseCountryCode: true,
          baseRegion: true,
          accountStatus: true,
          affiliateStatus: true,
          shippingDomestic: true,
          shippingInternational: true,
          returnWindowDays: true,
          returnsPaidBy: true,
        },
      },
      images: { orderBy: { sortOrder: "asc" } },
      productColours: { include: { colour: true } },
      productSizes: { include: { size: true } },
      productMaterials: { include: { material: true } },
      shippingCountries: true,
      diaryPosts: {
        include: {
          diaryPost: {
            select: { id: true, title: true, slug: true, coverImageUrl: true, status: true },
          },
        },
        take: 2,
      },
    },
  });

  if (!product) notFound();

  const { brand } = product;

  if (
    brand.accountStatus !== BrandAccountStatus.ACTIVE ||
    brand.affiliateStatus !== AffiliateStatus.ACTIVE
  ) {
    return (
      <SiteShell>
        <div className="mx-auto w-full max-w-[1800px] px-8 py-12 text-sm text-black/60">
          This product is not currently available.
        </div>
      </SiteShell>
    );
  }

  const relatedDb = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      isActive: true,
      publishedAt: { not: null },
      status: "APPROVED",
      brand: {
        accountStatus: BrandAccountStatus.ACTIVE,
        affiliateStatus: AffiliateStatus.ACTIVE,
      },
      OR: [
        { brandId: brand.id },
        product.categoryId ? { categoryId: product.categoryId } : {},
        product.productType ? { productType: product.productType } : {},
      ].filter((o) => Object.keys(o).length > 0),
    },
    orderBy: { publishedAt: "desc" },
    take: 4,
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      badges: true,
      brand: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });

  const outUrl = buildTrackedOutboundUrl(product.id, { sourcePage: "SEARCH" });
  const hasOutLink =
    brand.affiliateStatus === AffiliateStatus.ACTIVE &&
    (product.affiliateUrl || product.sourceUrl);

  const sortedSizes = [...product.productSizes].sort((a, b) => sortSizes(a.size, b.size));

  const brandLocation = [brand.baseCity, brand.baseCountryCode, regionLabel(brand.baseRegion)]
    .filter(Boolean).join(" · ");

  const publishedDiaryPosts = product.diaryPosts
    .filter((d) => d.diaryPost.status === "PUBLISHED")
    .map((d) => d.diaryPost);

  // Shipping display logic
  const hasShippingInfo = brand.shippingDomestic || brand.shippingInternational;
  const hasReturnsInfo = brand.returnWindowDays != null || brand.returnsPaidBy;
  const returnsLabel = brand.returnsPaidBy === "NO_RETURNS"
    ? "No returns accepted"
    : brand.returnWindowDays
    ? `${brand.returnWindowDays}-day returns · ${formatReturnsPaidBy(brand.returnsPaidBy) ?? "see brand site"}`
    : formatReturnsPaidBy(brand.returnsPaidBy);

  return (
    <SiteShell>
      <div className="mx-auto w-full max-w-[1800px] px-4 py-8 md:px-8 md:py-10">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-black/50">
          <Link href="/" className="hover:text-black transition-colors">Home</Link>
          <span>/</span>
          <Link href="/categories/clothing" className="hover:text-black transition-colors">Discover</Link>
          <span>/</span>
          <Link href={`/brands/${brand.slug}`} className="hover:text-black transition-colors">{brand.name}</Link>
          <span>/</span>
          <span className="text-black/70 line-clamp-1">{product.title}</span>
        </nav>

        {/* Main grid */}
        <div className="mx-auto max-w-4xl grid gap-8 lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr]">


          {/* Left: image gallery */}
          <ImageGallery
            images={product.images.map((i) => i.url)}
            title={product.title}
            badges={product.badges}
          />

          {/* Right: product info */}
          <div className="flex flex-col gap-6">

            {/* Brand + title */}
            <div>
              
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                {product.title}
              </h1>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              {product.price ? (
                product.badges.includes("sale") ? (
                  <span className="text-2xl font-semibold text-red-600">
                    <MoneyLabel amount={product.price.toString()} currency={product.currency} />
                  </span>
                ) : (
                  <span className="text-2xl font-semibold">
                    <MoneyLabel amount={product.price.toString()} currency={product.currency} />
                  </span>
                )
              ) : (
                <span className="text-xl text-black/40">Price not available</span>
              )}
            </div>

            {/* Colours */}
            {product.productColours.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-black/50">Colours</p>
                <div className="flex flex-wrap gap-2">
                  {product.productColours.map(({ colour }) => (
                    <span key={colour.id} className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-black/70">
                      {colour.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sortedSizes.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-black/50">Sizes available</p>
                <div className="flex flex-wrap gap-2">
                  {sortedSizes.map(({ size }) => (
                    <span key={size.id} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70">
                      {formatSizeLabel(size.name)}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-black/40">Select your size on the brand's website</p>
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-col gap-3">
              {hasOutLink ? (
                <ProductClickTrackingLink
                  href={outUrl}
                  productId={product.id}
                  productName={product.title}
                  brandName={brand.name}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-6 py-3.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Shop at {brand.name} ↗
                </ProductClickTrackingLink>
              ) : (
                <button disabled className="w-full rounded-full bg-black/20 px-6 py-3.5 text-sm font-medium text-white">
                  Coming soon
                </button>
              )}
            </div>

            {/* Accordions */}
            <div className="rounded-[20px] border border-black/8 bg-white divide-y divide-black/6 overflow-hidden">

              {/* Product details */}
              <Accordion title="Product details">
                <div className="space-y-2 text-sm text-black/60">
                  {product.productType && (
                    <div className="flex justify-between">
                      <span className="text-black/40">Type</span>
                      <span>{formatProductTypeLabel(product.productType)}</span>
                    </div>
                  )}
                  {product.productMaterials.length > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-black/40 shrink-0">Material</span>
                      <span className="text-right">{product.productMaterials.map((m) => m.material.name).join(", ")}</span>
                    </div>
                  )}
                  {product.note && (
                    <div className="pt-1 text-black/60 leading-relaxed">{product.note}</div>
                  )}
                  {!product.productType && !product.productMaterials.length && !product.note && (
                    <p className="text-black/40">Full details available on the brand's website.</p>
                  )}
                </div>
              </Accordion>

              {/* Shipping & returns */}
              <Accordion title="Shipping & returns">
                <div className="space-y-4 text-sm text-black/60">

                  {/* Shipping */}
                  <div>
                    <p className="font-medium text-black/80 mb-2">Shipping</p>
                    {hasShippingInfo ? (
                      <div className="space-y-1.5">
                        {brand.shippingDomestic && (
                          <div className="flex items-center justify-between">
                            <span className="text-black/40">Domestic</span>
                            <span>{brand.shippingDomestic}</span>
                          </div>
                        )}
                        {brand.shippingInternational && (
                          <div className="flex items-center justify-between">
                            <span className="text-black/40">International</span>
                            <span>{brand.shippingInternational}</span>
                          </div>
                        )}
                      </div>
                    ) : product.worldwideShipping ? (
                      <p>This product ships worldwide.</p>
                    ) : product.shippingCountries.length > 0 ? (
                      <p>
                        Ships to {product.shippingCountries.slice(0, 6).map((s) => s.countryCode).join(", ")}
                        {product.shippingCountries.length > 6 ? ` and ${product.shippingCountries.length - 6} more` : ""}.
                      </p>
                    ) : (
                      <p>Shipping details available on {brand.name}'s website.</p>
                    )}
                  </div>

                  {/* Returns */}
                  <div>
                    <p className="font-medium text-black/80 mb-2">Returns</p>
                    {hasReturnsInfo ? (
                      <p>{returnsLabel}</p>
                    ) : (
                      <p>Returns policy available on {brand.name}'s website.</p>
                    )}
                  </div>

                  <p className="text-[11px] text-black/40 pt-1 border-t border-black/6">
                    Purchases are completed on {brand.name}'s website. 
                  </p>
                </div>
              </Accordion>
            </div>

            {/* As seen in Diary */}
            {publishedDiaryPosts.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-black/50">As seen in Diary</p>
                <div className="flex flex-col gap-2">
                  {publishedDiaryPosts.map((post) => (
                    <Link key={post.id} href={`/diary/${post.slug}`} className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white p-3 hover:bg-black/[0.02] transition-colors">
                      {post.coverImageUrl && (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                          <Image src={post.coverImageUrl} alt={post.title} fill className="object-cover" sizes="48px" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-black/70 line-clamp-2">{post.title}</p>
                        <p className="mt-0.5 text-[11px] text-black/40">Veilora Diary →</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* You might also like */}
        {relatedDb.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-lg font-semibold tracking-tight">You might also like</h2>
            <div className="grid gap-5 grid-cols-2 sm:grid-cols-4">
              {relatedDb.map((p, index) => {
                const relatedOutUrl = buildTrackedOutboundUrl(p.id, { sourcePage: "SEARCH", position: index + 1 });
                return (
                  <Link key={p.id} href={`/b/${p.brand.slug}/p/${p.slug}`} className="group overflow-hidden rounded-3xl border border-black/5 bg-white transition hover:shadow-sm">
                    <div className="relative aspect-[3/4] bg-black/5">
                      {p.images[0]?.url ? (
                        <Image src={p.images[0].url} alt={p.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(max-width: 640px) 50vw, 25vw" />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-xs text-black/30">No image</div>
                      )}
                      {p.badges.includes("sale") && (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 border border-black/10 px-2 py-1 text-[10px] font-semibold tracking-wider">SALE</span>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] uppercase tracking-wide text-black/50">{p.brand.name}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium leading-5">{p.title}</p>
                      <p className="mt-2 text-sm text-black/60">
                        <MoneyLabel amount={p.price?.toString() ?? null} currency={p.currency} />
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </SiteShell>
  );
}
