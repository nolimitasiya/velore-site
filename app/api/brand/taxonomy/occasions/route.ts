import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireBrandContext();

    const items = await prisma.occasion.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load occasions" },
      {
        status:
          e?.message === "UNAUTHENTICATED"
            ? 401
            : e?.message === "FORBIDDEN"
            ? 403
            : 500,
      }
    );
  }
}