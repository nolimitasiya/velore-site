import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminSession();
  const events = await prisma.adminCalendarEvent.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ ok: true, events });
}

export async function POST(req: NextRequest) {
  await requireAdminSession();
  const body = await req.json().catch(() => ({}));
  const { title, date, time, description, color } = body;

  if (!title || !date) {
    return NextResponse.json({ ok: false, error: "Title and date are required" }, { status: 400 });
  }

  const event = await prisma.adminCalendarEvent.create({
    data: {
      title,
      date: new Date(date),
      time: time ?? null,
      description: description ?? null,
      color: color ?? "burgundy",
    },
  });

  return NextResponse.json({ ok: true, event });
}

export async function DELETE(req: NextRequest) {
  await requireAdminSession();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  await prisma.adminCalendarEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}