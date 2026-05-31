import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminSession();
  const notes = await prisma.adminNote.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ ok: true, notes });
}

export async function POST(req: NextRequest) {
  await requireAdminSession();
  const body = await req.json().catch(() => ({}));
  const { title, content } = body;

  if (!title) {
    return NextResponse.json({ ok: false, error: "Title is required" }, { status: 400 });
  }

  const note = await prisma.adminNote.create({
    data: { title, content: content ?? "" },
  });

  return NextResponse.json({ ok: true, note });
}