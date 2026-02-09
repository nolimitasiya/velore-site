// app/api/admin/products/[id]/publish/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { ProductStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const published = Boolean(body.published);

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (published && existing.status !== ProductStatus.APPROVED) {
      return NextResponse.json(
        { ok: false, error: "You can only publish APPROVED products." },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: { publishedAt: published ? new Date() : null },
      select: { id: true, publishedAt: true },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to update publish status" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}
