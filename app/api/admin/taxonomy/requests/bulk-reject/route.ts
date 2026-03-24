// C:\Users\Asiya\projects\dalra\app\api\admin\taxonomy\requests\bulk-reject\route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { adminId } = await requireAdminSession();

    const body = await req.json().catch(() => ({}));

    const rawIds = Array.isArray((body as any)?.ids) ? (body as any).ids : [];
    const ids: string[] = Array.from(
      new Set(rawIds.filter((x: unknown): x is string => typeof x === "string" && x.length > 10))
    );

    const reviewNote = ((body as any)?.reviewNote ?? "").trim() || null;

    if (!ids.length) {
      return NextResponse.json({ ok: false, error: "No ids provided" }, { status: 400 });
    }

    const res = await prisma.taxonomyRequest.updateMany({
      where: { id: { in: ids }, status: "PENDING" },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByAdminId: adminId,
        reviewNote, // ✅ requires schema field: reviewNote String?
      },
    });

    return NextResponse.json({ ok: true, updated: res.count, skipped: ids.length - res.count });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to bulk reject" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}