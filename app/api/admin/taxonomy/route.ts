import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);

    const type = (url.searchParams.get("type") || "").trim().toLowerCase();
    const productType = (url.searchParams.get("productType") || "").trim();
    const parent = (url.searchParams.get("parent") || "").trim().toLowerCase();

    switch (type) {
      case "occasions": {
        const items = await prisma.occasion.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        return NextResponse.json({ ok: true, items });
      }

      case "colours": {
        const items = await prisma.colour.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        return NextResponse.json({ ok: true, items });
      }

      case "sizes": {
        const items = await prisma.size.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        return NextResponse.json({ ok: true, items });
      }

      case "materials": {
        if (!productType) {
          const items = await prisma.material.findMany({
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });

          return NextResponse.json({ ok: true, items });
        }

        const allowed = await prisma.materialAllowedProductType.findMany({
          where: {
            productType: productType as any,
          },
          select: {
            materialId: true,
          },
        });

        if (!allowed.length) {
          const items = await prisma.material.findMany({
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });

          return NextResponse.json({
            ok: true,
            items,
            fallbackAll: true,
          });
        }

        const items = await prisma.material.findMany({
          where: {
            id: {
              in: allowed.map((item) => item.materialId),
            },
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        return NextResponse.json({ ok: true, items });
      }

      case "styles": {
        if (!productType) {
          const items = await prisma.style.findMany({
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });

          return NextResponse.json({ ok: true, items });
        }

        const allowed = await prisma.styleAllowedProductType.findMany({
          where: {
            productType: productType as any,
          },
          select: {
            styleId: true,
          },
        });

        if (!allowed.length) {
          const items = await prisma.style.findMany({
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          });

          return NextResponse.json({
            ok: true,
            items,
            fallbackAll: true,
          });
        }

        const items = await prisma.style.findMany({
          where: {
            id: {
              in: allowed.map((item) => item.styleId),
            },
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        return NextResponse.json({ ok: true, items });
      }

      case "categories": {
        if (!parent) {
          const items = await prisma.category.findMany({
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
            },
          });

          return NextResponse.json({ ok: true, items });
        }

        const parentCategory = await prisma.category.findUnique({
          where: {
            slug: parent,
          },
          select: {
            id: true,
          },
        });

        if (!parentCategory) {
          return NextResponse.json({
            ok: true,
            items: [],
          });
        }

        const items = await prisma.category.findMany({
          where: {
            parentId: parentCategory.id,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            slug: true,
          },
        });

        return NextResponse.json({ ok: true, items });
      }

      default:
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid taxonomy type",
          },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Failed to load taxonomy",
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