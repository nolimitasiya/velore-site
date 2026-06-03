import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

// GET /api/admin/personal/wellness/prayers?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns prayer records for a date range (used to load a full week)
export async function GET(req: NextRequest) {
  await requireAdminSession();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where =
    from && to
      ? { date: { gte: from, lte: to } }
      : {};

  const records = await prisma.wellnessPrayerRecord.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ ok: true, records });
}

// POST /api/admin/personal/wellness/prayers
// Body: { date: "YYYY-MM-DD", fajr, dhuhr, asr, maghrib, isha }
// Upserts — one record per day
export async function POST(req: NextRequest) {
  await requireAdminSession();

  const body = await req.json().catch(() => ({}));
  const { date, fajr, dhuhr, asr, maghrib, isha } = body;

  if (!date) {
    return NextResponse.json(
      { ok: false, error: "date is required" },
      { status: 400 }
    );
  }

  const record = await prisma.wellnessPrayerRecord.upsert({
    where: { date },
    create: {
      date,
      fajr: fajr ?? false,
      dhuhr: dhuhr ?? false,
      asr: asr ?? false,
      maghrib: maghrib ?? false,
      isha: isha ?? false,
    },
    update: {
      fajr: fajr ?? false,
      dhuhr: dhuhr ?? false,
      asr: asr ?? false,
      maghrib: maghrib ?? false,
      isha: isha ?? false,
    },
  });

  return NextResponse.json({ ok: true, record });
}