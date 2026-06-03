import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

// GET /api/admin/personal/wellness/journal
// Returns all journal entries ordered newest first
export async function GET() {
  await requireAdminSession();

  const entries = await prisma.wellnessJournalEntry.findMany({
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ ok: true, entries });
}

// POST /api/admin/personal/wellness/journal
// Body: { date: "YYYY-MM-DD", text: string }
// Upserts — one entry per day
export async function POST(req: NextRequest) {
  await requireAdminSession();

  const body = await req.json().catch(() => ({}));
  const { date, text } = body;

  if (!date || !text?.trim()) {
    return NextResponse.json(
      { ok: false, error: "date and text are required" },
      { status: 400 }
    );
  }

  const entry = await prisma.wellnessJournalEntry.upsert({
    where: { date },
    create: { date, text: text.trim() },
    update: { text: text.trim() },
  });

  return NextResponse.json({ ok: true, entry });
}

// DELETE /api/admin/personal/wellness/journal?date=YYYY-MM-DD
export async function DELETE(req: NextRequest) {
  await requireAdminSession();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { ok: false, error: "Missing date" },
      { status: 400 }
    );
  }

  await prisma.wellnessJournalEntry.deleteMany({ where: { date } });

  return NextResponse.json({ ok: true });
}