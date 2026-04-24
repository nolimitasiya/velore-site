import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { ProductStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeStatus(value: unknown): "DRAFT" | "PUBLISHED" {
  return value === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
}

function normalizeRelatedProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

export async function GET(_: Request, context: RouteContext) {
  await requireAdminSession();
  const { id } = await context.params;

  const post = await prisma.diaryPost.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
      relatedProducts: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, post });
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    await requireAdminSession();
    const { id } = await context.params;
    const body = await req.json();

    const title = normalizeString(body.title);
    const slug = normalizeString(body.slug);
    const editorName = normalizeString(body.editorName) || null;
    const excerpt = normalizeString(body.excerpt) || null;
    const coverImageUrl = normalizeString(body.coverImageUrl) || null;
    const coverImageAlt = normalizeString(body.coverImageAlt) || null;
    const contentHtml = normalizeString(body.contentHtml) || null;
    const shopSectionEyebrow = normalizeString(body.shopSectionEyebrow) || null;
    const shopSectionTitle = normalizeString(body.shopSectionTitle) || null;
    const shopSectionSubtitle = normalizeString(body.shopSectionSubtitle) || null;
    const status = normalizeStatus(body.status);
    const relatedProductIds = normalizeRelatedProductIds(body.relatedProductIds);

    if (!title) {
      return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 });
    }

    if (!slug) {
      return NextResponse.json({ ok: false, error: "Slug is required." }, { status: 400 });
    }

    const existing = await prisma.diaryPost.findUnique({
      where: { id },
      select: { id: true, publishedAt: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
    }

    const slugOwner = await prisma.diaryPost.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (slugOwner && slugOwner.id !== id) {
      return NextResponse.json({ ok: false, error: "Slug already exists." }, { status: 409 });
    }

    if (relatedProductIds.length > 0) {
      const validProducts = await prisma.product.findMany({
        where: {
          id: { in: relatedProductIds },
          status: ProductStatus.APPROVED,
          isActive: true,
          publishedAt: { not: null },
        },
        select: { id: true },
      });

      if (validProducts.length !== relatedProductIds.length) {
        return NextResponse.json(
          {
            ok: false,
            error: "One or more related products are invalid or not published.",
          },
          { status: 400 }
        );
      }
    }

    const post = await prisma.$transaction(async (tx) => {
      await tx.diaryPost.update({
        where: { id },
        data: {
          title,
          slug,
          editorName,
          excerpt,
          coverImageUrl,
          coverImageAlt,
          contentHtml,
          shopSectionEyebrow,
          shopSectionTitle,
          shopSectionSubtitle,
          status,
          publishedAt:
            status === "PUBLISHED"
              ? existing.publishedAt ?? new Date()
              : null,
        },
      });

      await tx.diaryPostProduct.deleteMany({
        where: { diaryPostId: id },
      });

      if (relatedProductIds.length > 0) {
        await tx.diaryPostProduct.createMany({
          data: relatedProductIds.map((productId, index) => ({
            diaryPostId: id,
            productId,
            sortOrder: index,
          })),
        });
      }

      return tx.diaryPost.findUnique({
        where: { id },
        include: {
          relatedProducts: {
            orderBy: { sortOrder: "asc" },
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("[PATCH /api/admin/diary/[id]] failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update diary post.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  await requireAdminSession();
  const { id } = await context.params;

  const existing = await prisma.diaryPost.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "Post not found." }, { status: 404 });
  }

  await prisma.diaryPost.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}