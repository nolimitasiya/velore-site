import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Missing request id (bad route call)" },
        { status: 400 }
      );
    }

    const { adminId } = await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim() : "";
    const note = reviewNote.length ? reviewNote : null;

    const tr = await prisma.taxonomyRequest.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!tr) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    if (tr.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: "Request is not pending" },
        { status: 409 }
      );
    }

    await prisma.taxonomyRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByAdminId: adminId,
        reviewNote: note,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to reject" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}