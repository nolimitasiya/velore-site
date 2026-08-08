import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import {
  MerchandisingScopeType,
  MerchandisingVersion,
  ProductType,
} from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MANUAL_LIMIT = 48;

type SaveAction = "SAVE_DRAFT" | "PUBLISH" | "DISCARD_DRAFT";

function isScopeType(value: unknown): value is MerchandisingScopeType {
  return (
    value === MerchandisingScopeType.PRODUCT_TYPE ||
    value === MerchandisingScopeType.OCCASION
  );
}

function isSaveAction(value: unknown): value is SaveAction {
  return (
    value === "SAVE_DRAFT" ||
    value === "PUBLISH" ||
    value === "DISCARD_DRAFT"
  );
}

function cleanScopeKey(value: unknown) {
  return String(value ?? "").trim();
}

function mapProduct(product: any) {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    price: product.price == null ? null : String(product.price),
    currency: product.currency,
    badges: product.badges ?? [],

    brand: {
      id: product.brand.id,
      name: product.brand.name,
      slug: product.brand.slug,
    },

    imageUrl: product.images?.[0]?.url ?? null,
  };
}

function buildScopeWhere(
  scopeType: MerchandisingScopeType,
  scopeKey: string
) {
  if (scopeType === MerchandisingScopeType.PRODUCT_TYPE) {
    return {
      OR: [
        {
          productTypes: {
            some: {
              productType: scopeKey as ProductType,
            },
          },
        },
        {
          productType: scopeKey as ProductType,
        },
      ],
    };
  }

  return {
    productOccasions: {
      some: {
        occasion: {
          slug: scopeKey.toLowerCase(),
        },
      },
    },
  };
}

async function validateScope(
  scopeType: MerchandisingScopeType,
  scopeKey: string
) {
  if (scopeType === MerchandisingScopeType.PRODUCT_TYPE) {
    const valid = Object.values(ProductType).includes(scopeKey as ProductType);

    if (!valid) {
      return {
        ok: false as const,
        error: "Invalid product type.",
      };
    }

    return { ok: true as const };
  }

  const occasion = await prisma.occasion.findUnique({
    where: {
      slug: scopeKey.toLowerCase(),
    },
    select: {
      id: true,
    },
  });

  if (!occasion) {
    return {
      ok: false as const,
      error: "Occasion not found.",
    };
  }

  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(req.url);

    const scopeTypeParam = searchParams.get("scopeType");
    const scopeKey = cleanScopeKey(searchParams.get("scopeKey"));

    if (!isScopeType(scopeTypeParam)) {
      return NextResponse.json(
        { error: "Invalid scopeType." },
        { status: 400 }
      );
    }

    if (!scopeKey) {
      return NextResponse.json(
        { error: "scopeKey is required." },
        { status: 400 }
      );
    }

    const scopeValidation = await validateScope(
      scopeTypeParam,
      scopeKey
    );

    if (!scopeValidation.ok) {
      return NextResponse.json(
        { error: scopeValidation.error },
        { status: 400 }
      );
    }

    const scopeWhere = buildScopeWhere(
      scopeTypeParam,
      scopeKey
    );

    const products = await prisma.product.findMany({
      where: {
        status: "APPROVED",
        isActive: true,
        publishedAt: { not: null },

        brand: {
          is: {
            accountStatus: "ACTIVE",
            affiliateStatus: "ACTIVE",
          },
        },

        ...scopeWhere,
      },

      orderBy: [
        { publishedAt: "desc" },
        { updatedAt: "desc" },
      ],

      // Load well beyond the curated 48 so you can
      // grab #67 and move it into #8.
      take: 300,

      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        currency: true,
        badges: true,

        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        images: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
          select: {
            url: true,
          },
        },
      },
    });

    const [draftPlacements, livePlacements] = await Promise.all([
      prisma.categoryMerchPlacement.findMany({
        where: {
          scopeType: scopeTypeParam,
          scopeKey,
          version: MerchandisingVersion.DRAFT,
        },
        orderBy: {
          position: "asc",
        },
      }),

      prisma.categoryMerchPlacement.findMany({
        where: {
          scopeType: scopeTypeParam,
          scopeKey,
          version: MerchandisingVersion.LIVE,
        },
        orderBy: {
          position: "asc",
        },
      }),
    ]);

    const productsById = new Map(
      products.map((product) => [product.id, product])
    );

    /*
     * If a draft exists, show the draft.
     * Otherwise show LIVE.
     * Otherwise use the automatic newest-first order.
     */
    const activePlacements =
      draftPlacements.length > 0
        ? draftPlacements
        : livePlacements;

    const manuallyOrderedProducts = activePlacements
      .map((placement) =>
        productsById.get(placement.productId)
      )
      .filter(Boolean);

    const manualIds = new Set(
      manuallyOrderedProducts.map(
        (product) => product!.id
      )
    );

    const automaticProducts = products.filter(
      (product) => !manualIds.has(product.id)
    );

    const orderedProducts = [
      ...manuallyOrderedProducts,
      ...automaticProducts,
    ].map(mapProduct);

    return NextResponse.json({
      ok: true,
      scopeType: scopeTypeParam,
      scopeKey,
      manualLimit: MANUAL_LIMIT,

      hasDraft: draftPlacements.length > 0,
      hasLive: livePlacements.length > 0,

      products: orderedProducts,

      draftPositions: draftPlacements.map(
        (placement) => ({
          productId: placement.productId,
          position: placement.position,
        })
      ),

      livePositions: livePlacements.map(
        (placement) => ({
          productId: placement.productId,
          position: placement.position,
        })
      ),
    });
  } catch (error) {
    console.error(
      "GET /api/admin/category-merchandising failed",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load category merchandising.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => null);

    const action = body?.action;
    const scopeType = body?.scopeType;
    const scopeKey = cleanScopeKey(body?.scopeKey);

    if (!isSaveAction(action)) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    if (!isScopeType(scopeType)) {
      return NextResponse.json(
        { error: "Invalid scopeType." },
        { status: 400 }
      );
    }

    if (!scopeKey) {
      return NextResponse.json(
        { error: "scopeKey is required." },
        { status: 400 }
      );
    }

    const scopeValidation = await validateScope(
      scopeType,
      scopeKey
    );

    if (!scopeValidation.ok) {
      return NextResponse.json(
        { error: scopeValidation.error },
        { status: 400 }
      );
    }

    /*
     * DISCARD DRAFT
     */
    if (action === "DISCARD_DRAFT") {
      await prisma.categoryMerchPlacement.deleteMany({
        where: {
          scopeType,
          scopeKey,
          version: MerchandisingVersion.DRAFT,
        },
      });

      return NextResponse.json({
        ok: true,
        action,
      });
    }

    /*
     * PUBLISH
     *
     * Copy the saved DRAFT positions into LIVE.
     */
    if (action === "PUBLISH") {
      const draftPlacements =
        await prisma.categoryMerchPlacement.findMany({
          where: {
            scopeType,
            scopeKey,
            version: MerchandisingVersion.DRAFT,
          },
          orderBy: {
            position: "asc",
          },
        });

      if (draftPlacements.length === 0) {
        return NextResponse.json(
          {
            error:
              "There is no saved draft to publish.",
          },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.categoryMerchPlacement.deleteMany({
          where: {
            scopeType,
            scopeKey,
            version: MerchandisingVersion.LIVE,
          },
        });

        await tx.categoryMerchPlacement.createMany({
          data: draftPlacements.map(
            (placement) => ({
              scopeType,
              scopeKey,
              productId: placement.productId,
              position: placement.position,
              version: MerchandisingVersion.LIVE,
            })
          ),
        });
      });

      return NextResponse.json({
        ok: true,
        action,
        publishedCount: draftPlacements.length,
      });
    }

    /*
     * SAVE DRAFT
     */
    const rawIds = Array.isArray(body?.productIds)
      ? body.productIds
      : [];

    const productIds = rawIds
      .map((value: unknown) =>
        String(value ?? "").trim()
      )
      .filter(Boolean);

    if (productIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one product is required.",
        },
        { status: 400 }
      );
    }

    if (productIds.length > MANUAL_LIMIT) {
      return NextResponse.json(
        {
          error: `Only the first ${MANUAL_LIMIT} positions can be manually curated.`,
        },
        { status: 400 }
      );
    }

    if (new Set(productIds).size !== productIds.length) {
      return NextResponse.json(
        {
          error:
            "Duplicate products were supplied.",
        },
        { status: 400 }
      );
    }

    const scopeWhere = buildScopeWhere(
      scopeType,
      scopeKey
    );

    /*
     * Validate that every supplied product is genuinely
     * eligible for this category/occasion.
     */
    const eligibleProducts =
      await prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },

          status: "APPROVED",
          isActive: true,
          publishedAt: { not: null },

          brand: {
            is: {
              accountStatus: "ACTIVE",
              affiliateStatus: "ACTIVE",
            },
          },

          ...scopeWhere,
        },

        select: {
          id: true,
        },
      });

    const eligibleIds = new Set(
      eligibleProducts.map((product) => product.id)
    );

    const invalidIds = productIds.filter(
  (id: string) => !eligibleIds.has(id)
);

    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error:
            "One or more products are no longer eligible for this collection.",
          invalidIds,
        },
        { status: 400 }
      );
    }

    /*
     * Replace the old draft entirely.
     *
     * This is much safer than shifting individual database
     * rows every time you drag something.
     */
    await prisma.$transaction(async (tx) => {
      await tx.categoryMerchPlacement.deleteMany({
        where: {
          scopeType,
          scopeKey,
          version: MerchandisingVersion.DRAFT,
        },
      });

      await tx.categoryMerchPlacement.createMany({
        data: productIds.map(
          (productId: string, index: number) => ({
            scopeType,
            scopeKey,
            productId,
            position: index + 1,
            version: MerchandisingVersion.DRAFT,
          })
        ),
      });
    });

    return NextResponse.json({
      ok: true,
      action,
      savedCount: productIds.length,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/category-merchandising failed",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update category merchandising.",
      },
      {
        status: 500,
      }
    );
  }
}