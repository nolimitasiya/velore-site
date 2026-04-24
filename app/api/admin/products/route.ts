import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdminSession();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const active = searchParams.get("active");
    const brand = searchParams.get("brand");
    const affiliate = searchParams.get("affiliate"); // "missing" | "ready" | null

    const and: any[] = [];

    if (q) {
      and.push({
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { brand: { name: { contains: q, mode: "insensitive" } } },
          { brand: { slug: { contains: q, mode: "insensitive" } } },
        ],
      });
    }

    if (active === "true") {
      and.push({ isActive: true });
    }

    if (active === "false") {
      and.push({ isActive: false });
    }

    if (brand && brand !== "all") {
      and.push({ brand: { slug: brand } });
    }

    if (affiliate === "missing") {
      and.push({
        OR: [
          { affiliateUrl: null },
          { affiliateUrl: "" },
        ],
      });
    }

    if (affiliate === "ready") {
      and.push({
        affiliateUrl: {
          not: null,
        },
      });
      and.push({
        NOT: {
          affiliateUrl: "",
        },
      });
    }

    const where = and.length ? { AND: and } : {};

    const productsRaw = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        currency: true,
        isActive: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        submittedAt: true,
        reviewNote: true,
        lastApprovedAt: true,
        affiliateUrl: true,
        brand: { select: { name: true, slug: true } },
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true },
        },
      },
    });

    const products = productsRaw.map((product) => ({
      id: product.id,
      title: product.title,
      slug: product.slug,
      price: product.price,
      currency: product.currency,
      isActive: product.isActive,
      publishedAt: product.publishedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      status: product.status,
      submittedAt: product.submittedAt,
      reviewNote: product.reviewNote,
      lastApprovedAt: product.lastApprovedAt,
      affiliateUrl: product.affiliateUrl,
      brand: product.brand,
      imageUrl: product.images[0]?.url ?? null,
    }));

    const brands = await prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { name: true, slug: true },
    });

    return NextResponse.json({ ok: true, products, brands });
  } catch (e: any) {
    const status = e?.message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load products" },
      { status }
    );
  }
}