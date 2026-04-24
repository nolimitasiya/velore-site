import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_KEYS = ["CLOTHING", "SALE", "OCCASION"] as const;
const BUCKETS = ["TOP_PICKS", "DISCOVER_MORE", "EXPLORE_NEW"] as const;

type MerchPageKey = (typeof PAGE_KEYS)[number];
type MerchBucket = (typeof BUCKETS)[number];

function isValidPageKey(value: unknown): value is MerchPageKey {
  return typeof value === "string" && PAGE_KEYS.includes(value as MerchPageKey);
}

function isValidBucket(value: unknown): value is MerchBucket {
  return typeof value === "string" && BUCKETS.includes(value as MerchBucket);
}

function parseOptionalDate(value: unknown) {
  if (value == null || value === "") return null;

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function parseOptionalString(value: unknown) {
  const str = String(value ?? "").trim();
  return str ? str : null;
}

function parseOptionalPosition(value: unknown) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) return null;
  return num;
}

async function productIsEligibleForPage(productId: string, pageKey: MerchPageKey) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      isActive: true,
      status: true,
      publishedAt: true,
      productType: true,
      badges: true,
      productOccasions: {
        select: { occasionId: true },
        take: 1,
      },
    },
  });

  if (!product) {
    return { ok: false, reason: "Product not found." };
  }

  if (!product.isActive || product.status !== "APPROVED" || !product.publishedAt) {
    return {
      ok: false,
      reason: "Only active, approved, published products can be merchandised.",
    };
  }

  if (pageKey === "CLOTHING" && !product.productType) {
    return {
      ok: false,
      reason: "Product must have a product type to appear in Clothing merchandising.",
    };
  }

  if (pageKey === "SALE" && !product.badges.includes("sale")) {
    return {
      ok: false,
      reason: "Product must have the sale badge to appear in Sale merchandising.",
    };
  }

  if (pageKey === "OCCASION" && product.productOccasions.length === 0) {
    return {
      ok: false,
      reason: "Product must be linked to at least one occasion.",
    };
  }

  return { ok: true as const };
}

async function getNextPosition(pageKey: MerchPageKey, bucket: MerchBucket) {
  const lastItem = await prisma.collectionMerchItem.findFirst({
    where: {
      pageKey,
      bucket,
    },
    orderBy: {
      position: "desc",
    },
    select: {
      position: true,
    },
  });

  return (lastItem?.position ?? 0) + 1;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(req.url);
    const pageKeyParam = searchParams.get("pageKey");

    if (!isValidPageKey(pageKeyParam)) {
      return NextResponse.json(
        { error: "Invalid or missing pageKey." },
        { status: 400 }
      );
    }

    const now = new Date();

    const items = await prisma.collectionMerchItem.findMany({
      where: {
        pageKey: pageKeyParam,
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
    });

    const grouped = {
      TOP_PICKS: [] as typeof items,
      DISCOVER_MORE: [] as typeof items,
      EXPLORE_NEW: [] as typeof items,
    };

    for (const item of items) {
      grouped[item.bucket].push(item);
    }

    return NextResponse.json({
      pageKey: pageKeyParam,
      now: now.toISOString(),
      buckets: grouped,
    });
  } catch (error) {
    console.error("GET /api/admin/merchandising failed", error);
    return NextResponse.json(
      { error: "Failed to load merchandising items." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => null);

    const pageKey = body?.pageKey;
    const bucket = body?.bucket;
    const productId = parseOptionalString(body?.productId);
    const note = parseOptionalString(body?.note);
    const startsAt = parseOptionalDate(body?.startsAt);
    const endsAt = parseOptionalDate(body?.endsAt);

    if (!isValidPageKey(pageKey)) {
      return NextResponse.json({ error: "Invalid pageKey." }, { status: 400 });
    }

    if (!isValidBucket(bucket)) {
      return NextResponse.json({ error: "Invalid bucket." }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }

    if (startsAt && endsAt && startsAt > endsAt) {
      return NextResponse.json(
        { error: "startsAt must be before endsAt." },
        { status: 400 }
      );
    }

    if (bucket === "TOP_PICKS") {
      const count = await prisma.collectionMerchItem.count({
        where: {
          pageKey,
          bucket,
          isActive: true,
        },
      });

      if (count >= 10) {
        return NextResponse.json(
          { error: "Top Picks is capped at 10 items." },
          { status: 400 }
        );
      }
    }

    const eligibility = await productIsEligibleForPage(productId, pageKey);
    if (!eligibility.ok) {
      return NextResponse.json({ error: eligibility.reason }, { status: 400 });
    }
    const existingOnPage = await prisma.collectionMerchItem.findFirst({
  where: {
    pageKey,
    productId,
  },
  select: {
    id: true,
    bucket: true,
  },
});

if (existingOnPage) {
  return NextResponse.json(
    {
      error: `This product is already in ${existingOnPage.bucket} for ${pageKey}.`,
    },
    { status: 409 }
  );
}
    const requestedPosition = parseOptionalPosition(body?.position);
    const position = requestedPosition ?? (await getNextPosition(pageKey, bucket));

    const created = await prisma.$transaction(async (tx) => {
      const conflictingAtPosition = await tx.collectionMerchItem.findUnique({
        where: {
          pageKey_bucket_position: {
            pageKey,
            bucket,
            position,
          },
        },
        select: { id: true },
      });

      if (conflictingAtPosition) {
        await tx.collectionMerchItem.updateMany({
          where: {
            pageKey,
            bucket,
            position: {
              gte: position,
            },
          },
          data: {
            position: {
              increment: 1,
            },
          },
        });
      }

      return tx.collectionMerchItem.create({
        data: {
          pageKey,
          bucket,
          productId,
          position,
          isActive: true,
          startsAt,
          endsAt,
          note,
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
      });
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/merchandising failed", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error:
            "This product is already in this bucket, or that position is already taken.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create merchandising item." },
      { status: 500 }
    );
  }
}