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
    key: `brand_forgot:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  });

  if (!rl.ok) return NextResponse.json({ ok: true });

  // ---- request body ----
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();

  if (!email) return NextResponse.json({ ok: true });

  const user = await prisma.user.findFirst({
  where: { email: { equals: email, mode: "insensitive" } },
  select: { email: true },
});
if (!user) return NextResponse.json({ ok: true });

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

  const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const resetUrl = `${appUrl}/brand/reset?token=${token}&email=${encodeURIComponent(email)}`;

  await sendResetEmail({ to: email, resetUrl, userType: "BRAND" });

  return NextResponse.json({ ok: true });
}
