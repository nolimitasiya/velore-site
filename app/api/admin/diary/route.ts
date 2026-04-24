import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { ProductStatus } from "@prisma/client";

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

export async function GET() {
  await requireAdminSession();

  const posts = await prisma.diaryPost.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });

  return NextResponse.json({ ok: true, posts });
}

export async function POST(req: Request) {
  await requireAdminSession();

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
    where: { slug },
    select: { id: true },
  });

  if (existing) {
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
    const created = await tx.diaryPost.create({
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
        publishedAt: status === "PUBLISHED" ? new Date() : null,
      },
    });

    if (relatedProductIds.length > 0) {
      await tx.diaryPostProduct.createMany({
        data: relatedProductIds.map((productId, index) => ({
          diaryPostId: created.id,
          productId,
          sortOrder: index,
        })),
      });
    }

    return tx.diaryPost.findUnique({
      where: { id: created.id },
      include: {
        relatedProducts: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });

  return NextResponse.json({ ok: true, post });
}