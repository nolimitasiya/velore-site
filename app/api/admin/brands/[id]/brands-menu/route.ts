import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export async function POST(
  req: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  await requireAdminSession();

  const { id } = await context.params;
  const body = await req.json();

  const showInBrandsMenu = Boolean(
    body.showInBrandsMenu
  );

  let brandsMenuOrder: number | null = null;

  if (
    body.brandsMenuOrder !== null &&
    body.brandsMenuOrder !== undefined &&
    body.brandsMenuOrder !== ""
  ) {
    const parsed = Number(body.brandsMenuOrder);

    if (
      Number.isNaN(parsed) ||
      parsed < 1 ||
      parsed > 12
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Brands menu order must be between 1 and 12.",
        },
        {
          status: 400,
        }
      );
    }

    brandsMenuOrder = parsed;
  }

  if (!showInBrandsMenu) {
    brandsMenuOrder = null;
  }

  const brand = await prisma.brand.update({
    where: {
      id,
    },

    data: {
      showInBrandsMenu,
      brandsMenuOrder,
    },

    select: {
      id: true,
      showInBrandsMenu: true,
      brandsMenuOrder: true,
    },
  });

  return NextResponse.json({
    ok: true,
    brand,
  });
}