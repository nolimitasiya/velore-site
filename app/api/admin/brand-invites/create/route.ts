// app/api/admin/brand-invites/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { sendBrandInviteEmail } from "@/lib/resend/templates/onboarding/brandInvite";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { regionFromCountry } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function toStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function slugifyBrand(name: string) {
  // Veilora Club -> veilora-club
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/['’]/g, "") // remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // non-alnum -> dash
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    await requireAdminSession();
    const body = await req.json().catch(() => ({}));

    const email = String(body.email || "").trim().toLowerCase();

    // UI still uses companySlug/companyName, but allow brandSlug/brandName too
    const brandName = String(body.companyName || body.brandName || "").trim();

    // ✅ slug: use provided slug if present; otherwise auto-generate from brandName
    const providedSlug = String(body.companySlug || body.brandSlug || "").trim();
    const brandSlug = providedSlug || (brandName ? slugifyBrand(brandName) : "");

    // ✅ location inputs (optional)
    const countryCode = toStr(body.countryCode)?.toUpperCase() ?? null; // "GB"
    const city = toStr(body.city); // "London"

    // ✅ computed region (optional)
    const baseRegion = countryCode ? regionFromCountry(countryCode) : null;

    const role: Role =
      (Object.values(Role) as string[]).includes(body.role)
        ? (body.role as Role)
        : Role.owner;

    if (!email || !brandName || !brandSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing email/brandName/brandSlug" },
        { status: 400 }
      );
    }

    // ✅ Brand = business (upsert by slug)
    // - keep existing values if incoming ones are null
    const brand = await prisma.brand.upsert({
      where: { slug: brandSlug },
      update: {
        name: brandName,
        ...(countryCode ? { baseCountryCode: countryCode } : {}),
        ...(baseRegion ? { baseRegion } : {}),
        ...(city ? { baseCity: city } : {}),
      },
      create: {
        slug: brandSlug,
        name: brandName,
        baseCountryCode: countryCode,
        baseRegion,
        baseCity: city,
      },
      select: { id: true, slug: true, name: true },
    });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

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
