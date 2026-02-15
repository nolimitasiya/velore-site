import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { makeResetToken, hashToken, minutesFromNow } from "@/lib/auth/passwordReset";
import { sendResetEmail } from "@/lib/email/sendResetEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminSession();
  const { id } = await ctx.params;

  const brand = await prisma.brand.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!brand) {
    return NextResponse.json({ ok: false, error: "BRAND_NOT_FOUND" }, { status: 404 });
  }

  // pick an owner/admin email for the brand
  const membership = await prisma.brandMembership.findFirst({
    where: { brandId: id, role: { in: ["owner", "admin"] } },
    select: { user: { select: { email: true } } },
    orderBy: { id: "asc" },
  });

  const email = membership?.user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: "NO_BRAND_EMAIL" }, { status: 400 });
  }

  const token = makeResetToken();
  const tokenHash = hashToken(token);

  await prisma.passwordResetToken.create({
    data: {
      userType: "BRAND",
      email,
      tokenHash,
      expiresAt: minutesFromNow(60),
    },
  });

  const origin = _req.headers.get("origin") || "http://localhost:3000";
  const resetUrl = `${origin}/brand/reset?token=${token}&email=${encodeURIComponent(email)}`;

  await sendResetEmail({ to: email, resetUrl, userType: "BRAND" });

  return NextResponse.json({ ok: true });
}
