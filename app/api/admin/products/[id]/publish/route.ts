// app/api/admin/products/[id]/publish/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdminSession();

    const id = params.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing product id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const published = Boolean(body.published);

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
