import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const token = req.headers.get("x-admin-token");
  if (token !== process.env.ADMIN_IMPORT_TOKEN) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");

  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  await prisma.brandInvite.update({
    where: { id },
    data: { usedAt: new Date() }, // mark as unusable
  });

  return NextResponse.json({ ok: true });
}
