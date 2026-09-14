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
  where: {
    email: {
      equals: email,
      mode: "insensitive",
    },
  },
  select: {
    email: true,
    name: true,
  },
});

if (!user) {
  return NextResponse.json({ ok: true });
}

// Some older brand accounts may not have User.name populated.
// Fall back to the original BrandApplication first name.
const brandApplication =
  await prisma.brandApplication.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      firstName: true,
    },
  });

const brandName =
  user.name?.trim() ||
  brandApplication?.firstName?.trim() ||
  null;

await prisma.passwordResetToken.deleteMany({
  where: {
    userType: "BRAND",
    email,
  },
});

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

  try {
  await sendResetEmail({
  to: user.email,
  resetUrl,
  userType: "BRAND",
  name: brandName,
});
} catch (err) {
  console.error("[brand-reset-email]", err);
}

  return NextResponse.json({ ok: true });
}
