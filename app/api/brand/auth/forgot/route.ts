import { hashRateLimitIp } from "@/lib/security/hashRateLimitIp";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeResetToken, hashToken, minutesFromNow } from "@/lib/auth/passwordReset";
import { sendResetEmail } from "@/lib/email/sendResetEmail";
import { rateLimit } from "@/lib/rateLimit";
import crypto from "node:crypto";
import { classifyClientIp } from "@/lib/security/clientIpClassification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
   // Do not create a shared "unknown" IP bucket.
  // Account-based limits remain active in all environments.
  const clientIp = classifyClientIp(req);

  if (clientIp.status === "TRUSTED") {
    const ipLimit = await rateLimit({
      key: `brand_forgot:${hashRateLimitIp(clientIp.candidate)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.ok) {
      return NextResponse.json({ ok: true });
    }
  }

  // ---- request body ----
const body = await req.json().catch(() => ({}));
const email = String(body.email || "").trim().toLowerCase();

if (!email) {
  return NextResponse.json({ ok: true });
}

// Hash the normalised email before using it as a rate-limit key.
const emailKey = crypto
  .createHash("sha256")
  .update(email)
  .digest("hex");

// Limit reset requests for the same account,
// even when requests originate from different IP addresses.
const accountLimit = await rateLimit({
  key: `brand_forgot:account:${emailKey}`,
  limit: 3,
  windowMs: 60 * 60 * 1000,
});

if (!accountLimit.ok) {
  return NextResponse.json({ ok: true });
}

const user = await prisma.user.findFirst({
  where: {
    email: {
      equals: email,
      mode: "insensitive",
    },
  },
  select: {
    id: true,
    email: true,
    name: true,
  },
});

if (!user) {
  return NextResponse.json({ ok: true });
}

// Only existing Brand members are eligible for Brand password resets.
const membership = await prisma.brandMembership.findFirst({
  where: {
    userId: user.id,
  },
  select: {
    brandId: true,
  },
});

if (!membership) {
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
