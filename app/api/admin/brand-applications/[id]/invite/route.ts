import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { regionFromCountry } from "@/lib/geo";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { sendBrandInviteEmail } from "@/lib/resend/templates/onboarding/brandInvite";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function guessBrandNameFromWebsite(url?: string | null) {
  const raw = String(url ?? "").trim();
  if (!raw) return "New Brand";

  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./, "");
    const base = host.split(".")[0] || host;

    return base
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "New Brand";
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();
  const { id } = await ctx.params;

  const app = await prisma.brandApplication.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      email: true,
      website: true,
      countryCode: true,
      city: true,
    },
  });

  if (!app)
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (String(app.status).toLowerCase() !== "contract_signed") {
    return NextResponse.json(
      { ok: false, error: "Contract must be signed before onboarding." },
      { status: 400 }
    );
  }

  const email = app.email.trim().toLowerCase();
  const brandName = guessBrandNameFromWebsite(app.website);
  const brandSlug = slugify(brandName);

  const countryCode =
    String(app.countryCode ?? "").trim().toUpperCase() || null;

  const city = String(app.city ?? "").trim() || null;

  const baseRegion = countryCode
    ? regionFromCountry(countryCode)
    : null;

  // ✅ Create or update brand
  const brand = await prisma.brand.upsert({
    where: { slug: brandSlug },
    update: {
      name: brandName,
      baseCountryCode: countryCode,
      baseRegion,
      baseCity: city,
      websiteUrl: app.website?.trim() || null,
      billingEmail: email, // Stripe billing email
    },
    create: {
      slug: brandSlug,
      name: brandName,
      baseCountryCode: countryCode,
      baseRegion,
      baseCity: city,
      websiteUrl: app.website?.trim() || null,
      billingEmail: email,
    },
    select: { id: true, name: true, slug: true },
  });

  // ✅ CREATE INVITE TOKEN
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(rawToken);

  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7 // 7 days
  );

  await prisma.brandInvite.create({
    data: {
      email,
      tokenHash,
      brandId: brand.id,
      role: Role.owner,
      expiresAt,
    },
  });

  // ✅ Build onboarding URL
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const onboardingUrl = `${siteUrl}/brand/onboarding?token=${rawToken}`;

  // ✅ Send email
  await sendBrandInviteEmail({
    to: email,
    brandName: brand.name,
    inviteLink: onboardingUrl,
    senderName: "Asiya",
  });

  // ✅ Mark application as onboarded
  await prisma.brandApplication.update({
    where: { id },
    data: { status: "onboarded" },
  });

  return NextResponse.json({
    ok: true,
    onboardingUrl,
    brand,
    expiresAt,
  });
}
