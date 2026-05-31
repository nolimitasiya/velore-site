import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { completed, text, tag } = body;

  const todo = await prisma.adminTodo.update({
    where: { id },
    data: {
      ...(text !== undefined && { text }),
      ...(tag !== undefined && { tag }),
      ...(completed !== undefined && {
        completed,
        completedAt: completed ? new Date() : null,
      }),
    },
  });

  return NextResponse.json({ ok: true, todo });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  await prisma.adminTodo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}