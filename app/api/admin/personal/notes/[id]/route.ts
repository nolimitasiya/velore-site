import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, content } = body;

  const note = await prisma.adminNote.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
    },
  });

  return NextResponse.json({ ok: true, note });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await params;
  await prisma.adminNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}