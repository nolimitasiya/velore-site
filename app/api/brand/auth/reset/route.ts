import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/passwordReset";
import { validatePassword } from "@/lib/auth/passwordStrength";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const token = String(body.token || "").trim();
  const newPassword = String(body.password || "");

  const v = validatePassword(newPassword);
  if (!v.ok) {
    return NextResponse.json(
      { ok: false, error: "WEAK_PASSWORD", details: v.errors },
      { status: 400 },
    );
  }

  const tokenHash = hashToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      userType: true,
      usedAt: true,
      expiresAt: true,
    },
  });

  if (
    !record ||
    record.userType !== "BRAND" ||
    record.email !== email ||
    record.usedAt ||
    record.expiresAt <= new Date()
  ) {
    return NextResponse.json(
      { ok: false, error: "INVALID_OR_EXPIRED" },
      { status: 400 },
    );
  }

  // ✅ Find user case-insensitively, then update by id
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "INVALID_OR_EXPIRED" },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const now = new Date();

      // Atomically claim the reset token.
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          id: record.id,
          tokenHash,
          userType: "BRAND",
          email,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      if (claimed.count !== 1) {
        throw new Error("RESET_TOKEN_ALREADY_USED");
      }

      // Update the password.
      await tx.user.update({
        where: { id: user.id },
        data: { password: hash },
      });

      // Revoke all existing brand sessions.
      await tx.brandAuthSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "RESET_TOKEN_ALREADY_USED"
    ) {
      return NextResponse.json(
        { ok: false, error: "INVALID_OR_EXPIRED" },
        { status: 400 },
      );
    }

    console.error("Brand password reset transaction failed");

    return NextResponse.json(
      { ok: false, error: "RESET_FAILED" },
      { status: 500 },
    );
  }
}
