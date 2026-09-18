import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export async function POST(req: Request) {
  try {
  await requireAdminSession();
} catch {
  return NextResponse.json(
    { ok: false, error: "Unauthorized" },
    { status: 401 }
  );
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
