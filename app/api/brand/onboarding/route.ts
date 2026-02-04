import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();

  if (!token || !password) {
    return NextResponse.json({ ok: false, error: "Missing token/password" }, { status: 400 });
  }

  const tokenHash = sha256(token);

  const invite = await prisma.brandInvite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      brandId: true,
      role: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ ok: false, error: "Invalid invite link" }, { status: 400 });
  }

  if (invite.usedAt) {
    return NextResponse.json({ ok: false, error: "Invite already used" }, { status: 400 });
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);

  // Create/update user
  const user = await prisma.user.upsert({
    where: { email: invite.email },
    update: {
      name: name || undefined,
      password: hash, // set/reset password on invite accept
    },
    create: {
      email: invite.email,
      name: name || null,
      password: hash,
    },
    select: { id: true, email: true, name: true },
  });

  // membership
  await prisma.brandMembership.upsert({
    where: { userId_brandId: { userId: user.id, brandId: invite.brandId } },
    update: { role: invite.role },
    create: { userId: user.id, brandId: invite.brandId, role: invite.role },
  });

  // mark invite used
  await prisma.brandInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date() },
  });

  // log them in
  const res = NextResponse.json({ ok: true });

  res.cookies.set("user_authed", user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  res.cookies.set("company_id", invite.brandId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return res;
}
