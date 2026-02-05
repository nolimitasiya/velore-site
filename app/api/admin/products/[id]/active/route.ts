// app/api/admin/products/[id]/active/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();

    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing product id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const isActive = Boolean(body.isActive);

    const product = await prisma.product.update({
      where: { id },
      data: { isActive },
      select: { id: true, isActive: true },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to update active status" },
      { status: 500 }
    );
  }
}
