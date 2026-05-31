import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminSession();
  const todos = await prisma.adminTodo.findMany({
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ ok: true, todos });
}

export async function POST(req: NextRequest) {
  await requireAdminSession();
  const body = await req.json().catch(() => ({}));
  const { text, tag } = body;

  if (!text) {
    return NextResponse.json({ ok: false, error: "Text is required" }, { status: 400 });
  }

  const todo = await prisma.adminTodo.create({
    data: { text, tag: tag ?? null },
  });

  return NextResponse.json({ ok: true, todo });
}