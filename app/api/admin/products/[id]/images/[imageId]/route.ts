import { NextRequest, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
    imageId: string;
  }>;
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAdminSession();

    const { id, imageId } = await params;

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const url =
      typeof body.url === "string"
        ? body.url.trim()
        : "";

    if (!url || !isHttpUrl(url)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter a valid image URL.",
        },
        { status: 400 }
      );
    }

    const image =
      await prisma.productImage.findFirst({
        where: {
          id: imageId,
          productId: id,
        },
        select: {
          id: true,
          productId: true,
          url: true,
          sortOrder: true,
        },
      });

    if (!image) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product image not found.",
        },
        { status: 404 }
      );
    }

    if (image.url === url) {
      return NextResponse.json({
        ok: true,
        unchanged: true,
        image,
      });
    }

    const updatedImage =
      await prisma.productImage.update({
        where: {
          id: image.id,
        },
        data: {
          url,
        },
        select: {
          id: true,
          productId: true,
          url: true,
          sortOrder: true,
        },
      });

    return NextResponse.json({
      ok: true,
      unchanged: false,
      image: updatedImage,
    });
  } catch (error: any) {
    console.error(
      "[admin/products/id/images/imageId PATCH]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ??
          "Failed to update product image.",
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

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    await requireAdminSession();

    const { id, imageId } = await params;

    const images = await prisma.productImage.findMany({
      where: {
        productId: id,
      },
      orderBy: {
        sortOrder: "asc",
      },
      select: {
        id: true,
        sortOrder: true,
      },
    });

    const image = images.find(
      (item) => item.id === imageId
    );

    if (!image) {
      return NextResponse.json(
        {
          ok: false,
          error: "Product image not found.",
        },
        { status: 404 }
      );
    }

    if (images.length <= 1) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A product must have at least one image.",
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({
        where: {
          id: imageId,
        },
      });

      const remainingImages =
        await tx.productImage.findMany({
          where: {
            productId: id,
          },
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              id: "asc",
            },
          ],
          select: {
            id: true,
          },
        });

      for (
        let index = 0;
        index < remainingImages.length;
        index += 1
      ) {
        await tx.productImage.update({
          where: {
            id: remainingImages[index].id,
          },
          data: {
            sortOrder: index,
          },
        });
      }
    });

    return NextResponse.json({
      ok: true,
      deletedImageId: imageId,
    });
  } catch (error: any) {
    console.error(
      "[admin/products/id/images/imageId DELETE]",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ??
          "Failed to remove product image.",
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