import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { PasswordResetUserType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.userType !== PasswordResetUserType.SHOPPER) {
  return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
}
    if (record.usedAt) {
      return NextResponse.json({ error: "This reset link has already been used." }, { status: 400 });
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);

    // Update password + mark token used in a transaction
    await prisma.$transaction([
      prisma.shopper.update({
        where: { email: record.email },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}