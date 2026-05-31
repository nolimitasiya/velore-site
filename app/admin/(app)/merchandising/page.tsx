import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import MerchandisingClient from "./MerchandisingClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_KEYS = ["CLOTHING", "SALE", "OCCASION"] as const;
const BUCKETS = ["TOP_PICKS", "DISCOVER_MORE", "EXPLORE_NEW"] as const;

export default async function MerchandisingPage() {
  await requireAdminSession();

  const pageKey = "CLOTHING" as const;
  const now = new Date();

  const [items, allItems] = await Promise.all([
    prisma.collectionMerchItem.findMany({
      where: {
        pageKey,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            currency: true,
            isActive: true,
            status: true,
            publishedAt: true,
            badges: true,
            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: {
                url: true,
              },
            },
          },
        },
      },
      orderBy: [{ bucket: "asc" }, { position: "asc" }],
    }),
    prisma.collectionMerchItem.findMany({
      select: {
        id: true,
        pageKey: true,
        bucket: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
      },
    }),
  ]);

  const serialisedItems = items.map((item) => ({
    id: item.id,
    pageKey: item.pageKey,
    bucket: item.bucket,
    productId: item.productId,
    position: item.position,
    isActive: item.isActive,
    startsAt: item.startsAt ? item.startsAt.toISOString() : null,
    endsAt: item.endsAt ? item.endsAt.toISOString() : null,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    product: {
      id: item.product.id,
      title: item.product.title,
      slug: item.product.slug,
      price: item.product.price ? item.product.price.toString() : null,
      currency: item.product.currency,
      isActive: item.product.isActive,
      status: item.product.status,
      publishedAt: item.product.publishedAt
        ? item.product.publishedAt.toISOString()
        : null,
      badges: item.product.badges,
      brand: {
        id: item.product.brand.id,
        name: item.product.brand.name,
        slug: item.product.brand.slug,
      },
      images: item.product.images.map((image) => ({
        url: image.url,
      })),
    },
  }));

  const initialData = {
    pageKey,
    buckets: {
      TOP_PICKS: serialisedItems.filter((item) => item.bucket === "TOP_PICKS"),
      DISCOVER_MORE: serialisedItems.filter(
        (item) => item.bucket === "DISCOVER_MORE"
      ),
      EXPLORE_NEW: serialisedItems.filter((item) => item.bucket === "EXPLORE_NEW"),
    },
  };

  const summary = PAGE_KEYS.map((page) => {
    const pageItems = allItems.filter((item) => item.pageKey === page);

    const bucketCounts = Object.fromEntries(
      BUCKETS.map((bucket) => [
        bucket,
        pageItems.filter((item) => item.bucket === bucket).length,
      ])
    ) as Record<(typeof BUCKETS)[number], number>;

    const liveCount = pageItems.filter((item) => {
      if (!item.isActive) return false;
      if (item.startsAt && item.startsAt > now) return false;
      if (item.endsAt && item.endsAt < now) return false;
      return true;
    }).length;

    return {
      pageKey: page,
      totalCount: pageItems.length,
      liveCount,
      bucketCounts,
    };
  });

  return (
  <main className="min-h-screen bg-neutral-50/70">
    <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-8">
      <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Admin · Content
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Collection Merchandising
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-white/60">
            Organise internal merchandising buckets for page 1 while keeping the shopper-facing grid seamless.
          </p>
        </div>
      </section>
      <MerchandisingClient initialData={initialData} summary={summary} />
    </div>
  </main>
);
}