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

  return <MerchandisingClient initialData={initialData} summary={summary} />;
}