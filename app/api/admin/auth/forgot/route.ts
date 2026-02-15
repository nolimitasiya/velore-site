import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeResetToken, hashToken, minutesFromNow } from "@/lib/auth/passwordReset";
import { sendResetEmail } from "@/lib/email/sendResetEmail";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // ---- rate limit (by IP) ----
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const rl = await rateLimit({
    key: `admin_forgot:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  });

  // Always return ok to avoid enumeration + keep UX smooth
  if (!rl.ok) return NextResponse.json({ ok: true });

  // ---- request body ----
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();

  if (!email) return NextResponse.json({ ok: true });

  const admin = await prisma.adminUser.findUnique({
    where: { email },
    select: { email: true },
  });

  if (!admin) return NextResponse.json({ ok: true });

  const token = makeResetToken();
  const tokenHash = hashToken(token);

  await prisma.passwordResetToken.create({
    data: {
      userType: "ADMIN",
      email,
      tokenHash,
      expiresAt: minutesFromNow(60),
    },
  });

  const origin = req.headers.get("origin") || "http://localhost:3000";
  const resetUrl = `${origin}/admin/reset?token=${token}&email=${encodeURIComponent(email)}`;

  await sendResetEmail({ to: email, resetUrl, userType: "ADMIN" });

  return NextResponse.json({ ok: true });
}
