// app/api/admin/brand-invites/resend/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { sendBrandInviteEmail } from "@/lib/email/resend";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body.email || "").trim().toLowerCase();
    const companyId = String(body.companyId || "").trim();

    const role: Role =
      (Object.values(Role) as string[]).includes(body.role)
        ? (body.role as Role)
        : Role.owner;

    if (!email || !companyId) {
      return NextResponse.json(
        { ok: false, error: "Missing email/companyId" },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { ok: false, error: "Company not found" },
        { status: 404 }
      );
    }

    // revoke any previous unused invites for this email+company
    await prisma.brandInvite.updateMany({
      where: { email, companyId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await prisma.brandInvite.create({
      data: { email, companyId, tokenHash, expiresAt, role },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const onboardingUrl = `${siteUrl}/brand/onboarding?token=${rawToken}`;

    await sendBrandInviteEmail({
      to: email,
      companyName: company.name,
      onboardingUrl,
      expiresAt,
    });

    return NextResponse.json({ ok: true, onboardingUrl, expiresAt, sent: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to resend invite" },
      { status: 500 }
    );
  }
}
