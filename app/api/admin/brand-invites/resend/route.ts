// app/api/admin/brand-invites/resend/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { sendBrandInviteEmail } from "@/lib/resend/templates/onboarding/brandInvite";
import { requireAdminSession } from "@/lib/auth/AdminSession";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json().catch(() => ({}));

    const email = String(body.email || "").trim().toLowerCase();

    // ✅ tolerate old payloads (brandId) while UI is being updated
    const brandId = String(body.brandId || "").trim();


    const role: Role =
      (Object.values(Role) as string[]).includes(body.role)
        ? (body.role as Role)
        : Role.owner;

    if (!email || !brandId) {
      return NextResponse.json(
        { ok: false, error: "Missing email/brandId" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { id: true, name: true, slug: true },
    });

    if (!brand) {
      return NextResponse.json(
        { ok: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    // revoke any previous unused invites for this email+brand
    // (Assuming your schema has usedAt nullable — keep as-is)
    await prisma.brandInvite.updateMany({
      where: { email, brandId: brand.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    await prisma.brandInvite.create({
      data: {
        email,
        brandId: brand.id,
        tokenHash,
        expiresAt,
        role,
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const onboardingUrl = `${siteUrl}/brand/onboarding?token=${rawToken}`;

    await sendBrandInviteEmail({
      to: email,
      brandName: brand.name,
      inviteLink: onboardingUrl,
      senderName: "Asiya",
    });

    return NextResponse.json({ ok: true, onboardingUrl, expiresAt, sent: true });
  } catch (e: any) {
    console.error("[admin-brand-invite-resend] error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Failed to resend invite",
        code: e?.code,
        meta: e?.meta,
      },
      { status: 500 }
    );
  }
}
