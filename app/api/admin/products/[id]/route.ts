import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  Badge,
  Prisma,
  ProductType,
} from "@prisma/client";
import { invalidateStorefrontProduct } from "@/lib/storefront/invalidate-product";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAdminSession();

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        brandId: true,
        sourceUrl: true,
        affiliateUrl: true,
        price: true,
        originalPrice: true,
        currency: true,
        badges: true,
        categoryId: true,
productType: true,
lengths: true,
polyesterFree: true,

productTypes: {
  select: {
    productType: true,
  },
},

productMaterials: {
  select: {
    materialId: true,
  },
},

productOccasions: {
  select: {
    occasionId: true,
  },
},

productStyles: {
  select: {
    styleId: true,
  },
},

productColours: {
  select: {
    colourId: true,
  },
},

productSizes: {
  select: {
    sizeId: true,

    size: {
      select: {
        id: true,
        slug: true,
      },
    },

    _count: {
      select: {
        fitMeasurements: true,
      },
    },

    sizeChartMapping: {
  select: {
    chartEntry: {
      select: {
        sizeLabel: true,
      },
    },
  },
},
  },
},
        images: {
  orderBy: {
    sortOrder: "asc",
  },
  select: {
    id: true,
    url: true,
    sortOrder: true,
  },
},

        brand: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
  ok: true,
  product: {
    id: product.id,
    title: product.title,
    brandId: product.brandId,
    sourceUrl: product.sourceUrl,
    affiliateUrl: product.affiliateUrl,

    price: product.price?.toString() ?? null,
    originalPrice: product.originalPrice?.toString() ?? null,
    currency: product.currency,
    badges: product.badges,

    categoryId: product.categoryId,
    productType: product.productType,
    lengths: product.lengths,
    polyesterFree: product.polyesterFree,

    productTypes: product.productTypes.map(
      (item) => item.productType
    ),

    materialIds: product.productMaterials.map(
  (item) => item.materialId
),

occasionIds: product.productOccasions.map(
  (item) => item.occasionId
),

styleIds: product.productStyles.map(
  (item) => item.styleId
),

colourIds: product.productColours.map(
  (item) => item.colourId
),
sizeIds: product.productSizes.map(
  (item) => item.sizeId
),



    productSizes: product.productSizes.map((item) => ({
  sizeId: item.sizeId,
  slug: item.size.slug,
  hasFitMeasurements: item._count.fitMeasurements > 0,
  hasSizeChartMapping: item.sizeChartMapping !== null,
})),

    images: product.images,

    brand: product.brand,
  },
});
  } catch (error: any) {
    console.error("[admin/products/id GET]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to load product.",
      },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
            ? 403
            : 500,
      }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAdminSession();

    const { id } = await params;
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid request body." },
        { status: 400 }
      );
    }

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const sourceUrl =
      typeof body.sourceUrl === "string"
        ? body.sourceUrl.trim()
        : "";

    const affiliateUrl =
      typeof body.affiliateUrl === "string"
        ? body.affiliateUrl.trim()
        : "";

    const currency =
      typeof body.currency === "string"
        ? body.currency.trim().toUpperCase()
        : "GBP";

    const priceRaw =
      typeof body.price === "string" ||
      typeof body.price === "number"
        ? String(body.price).trim()
        : "";

    const originalPriceRaw =
      typeof body.originalPrice === "string" ||
      typeof body.originalPrice === "number"
        ? String(body.originalPrice).trim()
        : "";

    const saleBadge = body.saleBadge === true;
    const categoryId =
  typeof body.categoryId === "string" && body.categoryId.trim()
    ? body.categoryId.trim()
    : null;

const productTypes = cleanStringArray(body.productTypes);
const materialIds = cleanStringArray(body.materialIds);
const occasionIds = cleanStringArray(body.occasionIds);
const styleIds = cleanStringArray(body.styleIds);
const colourIds = cleanStringArray(body.colourIds);
const sizeIds = cleanStringArray(body.sizeIds);
const lengths = cleanStringArray(body.lengths);

const polyesterFree = body.polyesterFree === true;

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Product name is required." },
        { status: 400 }
      );
    }

    if (!sourceUrl || !isHttpUrl(sourceUrl)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid product URL." },
        { status: 400 }
      );
    }

    if (affiliateUrl && !isHttpUrl(affiliateUrl)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid affiliate URL." },
        { status: 400 }
      );
    }

    const allowedCurrencies = ["GBP", "EUR", "CHF", "USD"];

    if (!allowedCurrencies.includes(currency)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported currency." },
        { status: 400 }
      );
    }

    if (!productTypes.length) {
  return NextResponse.json(
    {
      ok: false,
      error: "Select at least one product type.",
    },
    { status: 400 }
  );
}

const validProductTypes = new Set(Object.values(ProductType));

if (
  productTypes.some(
    (productType) =>
      !validProductTypes.has(productType as ProductType)
  )
) {
  return NextResponse.json(
    {
      ok: false,
      error: "Invalid product type.",
    },
    { status: 400 }
  );
}

    let price: Prisma.Decimal | null = null;

    if (priceRaw) {
      try {
        price = new Prisma.Decimal(priceRaw);

        if (price.isNegative()) {
          return NextResponse.json(
            { ok: false, error: "Price cannot be negative." },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "Enter a valid price." },
          { status: 400 }
        );
      }
    }

    let originalPrice: Prisma.Decimal | null = null;

    if (originalPriceRaw) {
      try {
        originalPrice = new Prisma.Decimal(originalPriceRaw);

        if (originalPrice.isNegative()) {
          return NextResponse.json(
            {
              ok: false,
              error: "Original price cannot be negative.",
            },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { ok: false, error: "Enter a valid original price." },
          { status: 400 }
        );
      }
    }

    if (originalPrice && !price) {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter a current price when adding an original price.",
        },
        { status: 400 }
      );
    }

    if (originalPrice && price && originalPrice.lte(price)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Original price must be higher than the current price.",
        },
        { status: 400 }
      );
    }

    if (categoryId) {
  const categoryExists = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      id: true,
    },
  });

  if (!categoryExists) {
    return NextResponse.json(
      {
        ok: false,
        error: "Selected category no longer exists.",
      },
      { status: 400 }
    );
  }
}

 const existing = await prisma.product.findUnique({
  where: { id },
  select: {
    id: true,
    slug: true,
    badges: true,

    brand: {
      select: {
        slug: true,
      },
    },

    productSizes: {
      select: {
        sizeId: true,

        size: {
          select: {
            slug: true,
          },
        },

        _count: {
          select: {
            fitMeasurements: true,
          },
        },

        sizeChartMapping: {
          select: {
            chartEntry: {
              select: {
                sizeLabel: true,
              },
            },
          },
        },
      },
    },
  },
});

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Product not found." },
        { status: 404 }
      );
    }

const existingSizeIds = new Set(
  existing.productSizes.map((item) => item.sizeId)
);

const requestedSizeIds = new Set(sizeIds);

const sizeIdsToAdd = sizeIds.filter(
  (sizeId) => !existingSizeIds.has(sizeId)
);

const productSizesToRemove = existing.productSizes.filter(
  (item) => !requestedSizeIds.has(item.sizeId)
);

const protectedProductSizes = productSizesToRemove.filter(
  (item) =>
    item._count.fitMeasurements > 0 ||
    item.sizeChartMapping !== null
);

if (protectedProductSizes.length) {
  const protectedLabels = protectedProductSizes
    .map((item) => item.size.slug)
    .join(", ");

  return NextResponse.json(
    {
      ok: false,
      error:
        `Cannot remove size${protectedProductSizes.length === 1 ? "" : "s"} ` +
        `${protectedLabels} because ${
          protectedProductSizes.length === 1 ? "it has" : "they have"
        } Fit measurements or size-chart mappings. Remove the Fit data first.`,
    },
    { status: 409 }
  );
}

    const badges = saleBadge
      ? Array.from(new Set([...existing.badges, Badge.sale]))
      : existing.badges.filter((badge) => badge !== Badge.sale);

   const product = await prisma.$transaction(async (tx) => {
  const updated = await tx.product.update({
    where: { id },
    data: {
      title,
      sourceUrl,
      affiliateUrl: affiliateUrl || null,
      price,
      originalPrice,
      currency,
      badges,

      categoryId,
      productType: productTypes[0] as ProductType,
      lengths,
      polyesterFree,
    },
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      affiliateUrl: true,
      price: true,
      originalPrice: true,
      currency: true,
      badges: true,
      updatedAt: true,
    },
  });

  await tx.productProductType.deleteMany({
    where: { productId: id },
  });

  if (productTypes.length) {
    await tx.productProductType.createMany({
      data: productTypes.map((productType) => ({
        productId: id,
        productType: productType as ProductType,
      })),
      skipDuplicates: true,
    });
  }

  await tx.productMaterial.deleteMany({
    where: { productId: id },
  });

  if (materialIds.length) {
    await tx.productMaterial.createMany({
      data: materialIds.map((materialId) => ({
        productId: id,
        materialId,
      })),
      skipDuplicates: true,
    });
  }

  await tx.productOccasion.deleteMany({
    where: { productId: id },
  });

  if (occasionIds.length) {
    await tx.productOccasion.createMany({
      data: occasionIds.map((occasionId) => ({
        productId: id,
        occasionId,
      })),
      skipDuplicates: true,
    });
  }

  await tx.productStyle.deleteMany({
    where: { productId: id },
  });

  if (styleIds.length) {
    await tx.productStyle.createMany({
      data: styleIds.map((styleId) => ({
        productId: id,
        styleId,
      })),
      skipDuplicates: true,
    });
  }

  await tx.productColour.deleteMany({
    where: { productId: id },
  });

  if (colourIds.length) {
    await tx.productColour.createMany({
      data: colourIds.map((colourId) => ({
        productId: id,
        colourId,
      })),
      skipDuplicates: true,
    });
  }

  if (productSizesToRemove.length) {
    await tx.productSize.deleteMany({
      where: {
        productId: id,
        sizeId: {
          in: productSizesToRemove.map((item) => item.sizeId),
        },
      },
    });
  }

  if (sizeIdsToAdd.length) {
    await tx.productSize.createMany({
      data: sizeIdsToAdd.map((sizeId) => ({
        productId: id,
        sizeId,
      })),
      skipDuplicates: true,
    });
  }

  return updated;
});

   invalidateStorefrontProduct({
  productId: product.id,
  productSlug: existing.slug,
  brandSlug: existing.brand.slug,
});


    return NextResponse.json({
      ok: true,
      product: {
        ...product,
        price: product.price?.toString() ?? null,
        originalPrice: product.originalPrice?.toString() ?? null,
      },
    });
 } catch (error: any) {
  console.error("[admin/products/id PATCH]", error);

  if (error?.code === "P2002") {
    return NextResponse.json(
      {
        ok: false,
        error: "A product with these details already exists.",
      },
      { status: 409 }
    );
  }

  if (error?.code === "P2003") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "One of the selected taxonomy values no longer exists. Refresh and try again.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: error?.message ?? "Failed to update product.",
    },
    {
      status:
        error?.message === "UNAUTHENTICATED"
          ? 401
          : error?.message === "FORBIDDEN"
          ? 403
          : 500,
    }
  );
}
}