import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import { ProductType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ALLOWED_TYPES = new Set(["MATERIAL", "COLOUR", "SIZE"] as const);

export async function POST(req: NextRequest) {
  try {
    const { userId, brandId } = await requireBrandContext();

    const body = await req.json().catch(() => ({}));
    const type = String(body?.type ?? "").toUpperCase();
    const name = String(body?.name ?? "").trim();
    const reason = body?.reason ? String(body.reason).trim() : null;

    const productTypes: ProductType[] = Array.isArray(body?.productTypes)
  ? body.productTypes.filter((x: any): x is ProductType =>
      typeof x === "string" && Object.values(ProductType).includes(x as ProductType)
    )
  : [];

  if (!ALLOWED_TYPES.has(type as any)) {
      return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400 });
    }

if (type === "MATERIAL") {
  if (!productTypes.length) {
    return NextResponse.json({ ok: false, error: "Missing product type context" }, { status: 400 });
  }
}

    if (name.length < 2 || name.length > 60) {
      return NextResponse.json({ ok: false, error: "Name must be 2–60 characters" }, { status: 400 });
    }

    const slug = slugify(name);
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Invalid name" }, { status: 400 });
    }

    // ✅ prevent duplicate pending requests for same slug/type (nice UX)
    // ✅ prevent duplicate requests (matches @@unique([brandId, type, slug]))
const existing = await prisma.taxonomyRequest.findFirst({
  where: { brandId, type: type as any, slug },
  select: { id: true, status: true },
});

if (existing) {
  return NextResponse.json(
    { ok: false, error: `Request already exists (${existing.status}).` },
    { status: 409 }
  );
}

    const created = await prisma.taxonomyRequest.create({
  data: {
    brandId,
    userId,
    type: type as any,
    name,
    slug,
    reason,
    ...(type === "MATERIAL" ? { productTypes } : {}),
  },
  select: { id: true, status: true, type: true, name: true },
});

    return NextResponse.json({ ok: true, request: created });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to submit request" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : e?.message === "FORBIDDEN" ? 403 : 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { brandId, userId } = await requireBrandContext();

    const url = new URL(req.url);
    const raw = (url.searchParams.get("status") || "ALL").toUpperCase();

    const where: any = { brandId, userId };

    if (raw !== "ALL") {
      if (!["PENDING", "APPROVED", "REJECTED"].includes(raw)) {
        return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
      }
      where.status = raw;
    }

    const items = await prisma.taxonomyRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        name: true,
        reason: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        reviewNote: true,
      },
      take: 200,
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load requests" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}