import { hashRateLimitIp } from "@/lib/security/hashRateLimitIp";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { makeResetToken, hashToken, minutesFromNow } from "@/lib/auth/passwordReset";
import { sendResetEmail } from "@/lib/email/sendResetEmail";
import { buildSiteUrl } from "@/lib/config/siteUrl";
import { rateLimit } from "@/lib/rateLimit";
import crypto from "node:crypto";
import { classifyClientIp } from "@/lib/security/clientIpClassification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
   // Only use IP-based limiting when the deployment policy
  // identifies a Vercel-normalized client IP.
  const clientIp = classifyClientIp(req);

  if (clientIp.status === "TRUSTED") {
    const ipLimit = await rateLimit({
      key: `admin_forgot:${hashRateLimitIp(clientIp.candidate)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    // Keep the response generic to avoid account enumeration.
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

// Hash the normalised email so the rate-limit table
// does not store email addresses in plaintext.
const emailKey = crypto
  .createHash("sha256")
  .update(email)
  .digest("hex");

// Limit reset requests targeting the same email,
// even when they originate from different IP addresses.
const accountLimit = await rateLimit({
  key: `admin_forgot:account:${emailKey}`,
  limit: 3,
  windowMs: 60 * 60 * 1000,
});

// Keep the response identical for blocked requests
// and unknown accounts.
if (!accountLimit.ok) {
  return NextResponse.json({ ok: true });
}

  let resetBaseUrl: string;

  try {
    resetBaseUrl = buildSiteUrl("/admin/reset");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Server configuration unavailable." },
      { status: 503 },
    );
  }

  const admin = await prisma.adminUser.findFirst({
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

if (!admin) {
  return NextResponse.json({ ok: true });
}

await prisma.passwordResetToken.deleteMany({
  where: {
    userType: "ADMIN",
    email,
  },
});

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

const resetUrlObject = new URL(resetBaseUrl);
resetUrlObject.searchParams.set("token", token);
resetUrlObject.searchParams.set("email", email);
const resetUrl = resetUrlObject.toString();
  try {
  await sendResetEmail({
  to: admin.email,
  resetUrl,
  userType: "ADMIN",
  name: admin.name,
});
} catch (err) {
  console.error("[admin-reset-email]", err);
}

return NextResponse.json({ ok: true });

}
