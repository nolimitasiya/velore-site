import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/passwordReset";
import { validatePassword } from "@/lib/auth/passwordStrength";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const token = String(body.token || "").trim();
  const newPassword = String(body.password || "");

  const v = validatePassword(newPassword);
if (!v.ok) {
  return NextResponse.json({ ok: false, error: "WEAK_PASSWORD", details: v.errors }, { status: 400 });
}


  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, email: true, userType: true, usedAt: true, expiresAt: true },
  });

  if (
    !record ||
    record.userType !== "BRAND" ||
    record.email !== email ||
    record.usedAt ||
    record.expiresAt < new Date()
  ) {
    return NextResponse.json({ ok: false, error: "INVALID_OR_EXPIRED" }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { password: hash },
    }),
    prisma.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
