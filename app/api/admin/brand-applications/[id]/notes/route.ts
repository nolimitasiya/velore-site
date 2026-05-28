import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const content = String(body.content ?? "").trim();

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ ok: false, error: "Note is required" }, { status: 400 });
  }

  const application = await prisma.brandApplication.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!application) {
    return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
  }

  const note = await prisma.brandApplicationNote.create({
    data: {
      applicationId: id,
      content,
    },
  });

  return NextResponse.json({ ok: true, note });
}