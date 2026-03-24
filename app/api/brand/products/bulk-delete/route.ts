// C:\Users\Asiya\projects\dalra\app\api\brand\products\bulk-delete\route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  ids: z.array(z.string().min(1)).optional(), // delete selected
  deleteAll: z.boolean().optional(),          // delete all
});

export async function POST(req: Request) {
  try {
    const { brandId } = await requireBrandContext();

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }

    const { ids, deleteAll } = parsed.data;

    // ✅ enforce exactly ONE mode:
    // - either deleteAll === true
    // - OR ids has at least 1 element
    const hasIds = !!ids?.length;
    const wantsDeleteAll = !!deleteAll;

    if (wantsDeleteAll === hasIds) {
      return NextResponse.json(
        { ok: false, error: "Provide either { deleteAll: true } OR { ids: [...] }" },
        { status: 400 }
      );
    }

    if (wantsDeleteAll) {
      const res = await prisma.product.deleteMany({ where: { brandId } });
      return NextResponse.json({ ok: true, deleted: res.count });
    }

    // hasIds is true here
    const res = await prisma.product.deleteMany({
      where: { brandId, id: { in: ids! } },
    });

    return NextResponse.json({ ok: true, deleted: res.count });
  } catch (e: any) {
    if (e?.message === "UNAUTHENTICATED") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}