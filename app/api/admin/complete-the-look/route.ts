import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const productSelect = {
  id: true,
  title: true,
  slug: true,
  price: true,
  currency: true,
  productType: true,
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
      sortOrder: "asc" as const,
    },
    take: 1,
    select: {
      url: true,
    },
  },
};

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(req.url);

    const productId = searchParams.get("productId");
    const q = searchParams.get("q")?.trim() ?? "";

    // Search products
    if (q) {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          status: "APPROVED",
          publishedAt: {
            not: null,
          },
          OR: [
            {
              title: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              brand: {
                name: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          ],
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: 20,
        select: productSelect,
      });

      return NextResponse.json({
        ok: true,
        products: products.map((product) => ({
          ...product,
          price: product.price?.toString() ?? null,
        })),
      });
    }

    // Load an existing Complete the Look arrangement
    if (productId) {
      const product = await prisma.product.findUnique({
        where: {
          id: productId,
        },
        select: productSelect,
      });

      if (!product) {
        return NextResponse.json(
          {
            ok: false,
            error: "Product not found.",
          },
          {
            status: 404,
          }
        );
      }

      const links = await prisma.productCompleteTheLook.findMany({
        where: {
          productId,
        },
        orderBy: {
          position: "asc",
        },
        include: {
          linkedProduct: {
            select: productSelect,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        product: {
          ...product,
          price: product.price?.toString() ?? null,
        },
        linkedProducts: links.map((link) => ({
          ...link.linkedProduct,
          price: link.linkedProduct.price?.toString() ?? null,
        })),
      });
    }

    const looks = await prisma.product.findMany({
  where: {
    completeTheLook: {
      some: {},
    },
  },

  orderBy: {
    updatedAt: "desc",
  },

  select: {
    id: true,
    title: true,
    slug: true,
    price: true,
    currency: true,

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

    completeTheLook: {
      orderBy: {
        position: "asc",
      },

      include: {
        linkedProduct: {
          select: productSelect,
        },
      },
    },
  },
});

return NextResponse.json({
  ok: true,

  looks: looks.map((product) => ({
    id: product.id,
    title: product.title,
    slug: product.slug,
    price: product.price?.toString() ?? null,
    currency: product.currency,
    brand: product.brand,
    images: product.images,

    linkedProducts:
      product.completeTheLook.map(
        (link) => ({
          ...link.linkedProduct,

          price:
            link.linkedProduct.price?.toString() ??
            null,
        })
      ),
  })),
});
  } catch (error) {
    console.error("Complete the Look GET error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load Complete the Look.",
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

    const body = await req.json();

    const productId =
      typeof body.productId === "string"
        ? body.productId
        : "";

    const linkedProductIds = Array.isArray(body.linkedProductIds)
      ? body.linkedProductIds.filter(
          (value: unknown): value is string =>
            typeof value === "string"
        )
      : [];

    if (!productId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (linkedProductIds.length > 4) {
      return NextResponse.json(
        {
          ok: false,
          error: "You can select up to 4 products.",
        },
        {
          status: 400,
        }
      );
    }

    if (linkedProductIds.includes(productId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "A product cannot complete its own look.",
        },
        {
          status: 400,
        }
      );
    }

    const uniqueIds: string[] = Array.from(
  new Set<string>(linkedProductIds)
);

   await prisma.$transaction(async (tx) => {
  await tx.productCompleteTheLook.deleteMany({
    where: {
      productId,
    },
  });

  if (uniqueIds.length > 0) {
    await tx.productCompleteTheLook.createMany({
      data: uniqueIds.map(
        (linkedProductId, index) => ({
          productId,
          linkedProductId,
          position: index + 1,
        })
      ),
    });
  }
});

    return NextResponse.json({
      ok: true,
      savedCount: uniqueIds.length,
    });
  } catch (error) {
    console.error("Complete the Look POST error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to save Complete the Look.",
      },
      {
        status: 500,
      }
    );
  }
}

  export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(req.url);

    const productId =
      searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product is required.",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.productCompleteTheLook.deleteMany({
      where: {
        productId,
      },
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error(
      "Complete the Look DELETE error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Failed to unlink Complete the Look.",
      },
      {
        status: 500,
      }
    );
  }
}