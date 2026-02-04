// app/api/admin/brand-invites/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { sendBrandInviteEmail } from "@/lib/resend/templates/onboarding/brandInvite";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body.email || "").trim().toLowerCase();
    const brandSlug = String(body.companySlug || body.brandSlug || "").trim(); // UI still uses companySlug
    const brandName = String(body.companyName || body.brandName || "").trim(); // UI still uses companyName

    const role: Role =
      (Object.values(Role) as string[]).includes(body.role)
        ? (body.role as Role)
        : Role.owner;

    if (!email || !brandSlug || !brandName) {
      return NextResponse.json(
        { ok: false, error: "Missing email/brandSlug/brandName" },
        { status: 400 }
      );
    }

    // ✅ Brand = business (upsert by slug)
    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      update: { name: brandName },
      create: { slug: brandSlug, name: brandName },
      select: { id: true, slug: true, name: true },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    // Optional: prevent duplicate active invites
    // (adjust statuses to match your schema)
    // await prisma.brandInvite.deleteMany({
    //   where: { email, brandId: brand.id, status: "pending" },
    // });

    const invite = await prisma.brandInvite.create({
      data: {
        email,
        tokenHash,
        brandId: brand.id,
        role,
        expiresAt,
      },
      select: { id: true },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const onboardingUrl = `${siteUrl}/brand/onboarding?token=${rawToken}`;

    await sendBrandInviteEmail({
      to: email,
      brandName: brand.name,
      inviteLink: onboardingUrl,
      senderName: "Asiya",
    });

    return NextResponse.json({
      ok: true,
      inviteId: invite.id,
      brand,
      onboardingUrl,
      expiresAt,
      sent: true,
    });
  } catch (e: any) {
    console.error("[admin-brand-invite-create] error:", e);
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? "Failed to create invite",
        code: e?.code,
        meta: e?.meta,
      },
      { status: 500 }
    );
  }
}
