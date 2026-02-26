import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();
  const { id } = await ctx.params;

  const body = await req.json();
  const content = String(body.content ?? "").trim();

  if (!content) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const note = await prisma.brandNote.create({
    data: {
      brandId: id,
      content,
    },
  });

  return NextResponse.json({ ok: true, note });
}