import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

// GET /api/admin/personal/wellness/ayat?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  await requireAdminSession();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where =
    from && to
      ? { date: { gte: from, lte: to } }
      : {};

  const records = await prisma.wellnessAyatRecord.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ ok: true, records });
}

// POST /api/admin/personal/wellness/ayat
// Body: { date: "YYYY-MM-DD", count: number }
export async function POST(req: NextRequest) {
  await requireAdminSession();

  const body = await req.json().catch(() => ({}));
  const { date, count } = body;

  if (!date || typeof count !== "number") {
    return NextResponse.json(
      { ok: false, error: "date and count are required" },
      { status: 400 }
    );
  }

  const record = await prisma.wellnessAyatRecord.upsert({
    where: { date },
    create: { date, count: Math.min(15, Math.max(0, count)) },
    update: { count: Math.min(15, Math.max(0, count)) },
  });

  return NextResponse.json({ ok: true, record });
}