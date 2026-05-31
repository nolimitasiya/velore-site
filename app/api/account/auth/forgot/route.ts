import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import { sendShopperResetEmail } from "@/lib/email/sendShopperResetEmail";
import { PasswordResetUserType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    const shopper = await prisma.shopper.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, firstName: true },
    });

    if (shopper) {
      // Invalidate any existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { userType: PasswordResetUserType.SHOPPER, email: normalizedEmail },
      });

      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 60 min

     await prisma.passwordResetToken.create({
  data: {
    userType: PasswordResetUserType.SHOPPER,
    email: normalizedEmail,
    tokenHash,
    expiresAt,
  },
});

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.veiloraclub.com";
      const resetUrl = `${baseUrl}/account/reset?token=${token}`;

      // Non-blocking
      sendShopperResetEmail({
        to: shopper.email,
        resetUrl,
        firstName: shopper.firstName,
      }).catch((err) => console.error("[shopper-reset-email]", err));
    }

    // Always return ok — never reveal if email exists
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}