// app/api/admin/brand-invites/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { sendBrandInviteEmail } from "@/lib/resend/templates/onboarding/brandInvite";


function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body.email || "").trim().toLowerCase();
    const companySlug = String(body.companySlug || "").trim();
    const companyName = String(body.companyName || "").trim();

    const role: Role =
      (Object.values(Role) as string[]).includes(body.role)
        ? (body.role as Role)
        : Role.owner;

    if (!email || !companySlug || !companyName) {
      return NextResponse.json(
        { ok: false, error: "Missing email/companySlug/companyName" },
        { status: 400 }
      );
    }

    const company = await prisma.company.upsert({
      where: { slug: companySlug },
      update: { name: companyName },
      create: { slug: companySlug, name: companyName },
      select: { id: true, slug: true, name: true },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await prisma.brandInvite.create({
      data: {
        email,
        tokenHash,
        companyId: company.id,
        role,
        expiresAt,
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const onboardingUrl = `${siteUrl}/brand/onboarding?token=${rawToken}`;

    await sendBrandInviteEmail({
  to: email,
  brandName: companyName,      // or company.name if you prefer
  inviteLink: onboardingUrl,    // this is the link you created
  senderName: "Asiya",
});



    return NextResponse.json({
      ok: true,
      company,
      onboardingUrl,
      expiresAt,
      sent: true,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to create invite" },
      { status: 500 }
    );
  }
}
