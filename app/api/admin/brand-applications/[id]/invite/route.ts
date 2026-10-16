import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { regionFromCountry } from "@/lib/geo";
import crypto from "crypto";
import { Role } from "@prisma/client";
import {syncBrandProfileToKlaviyo,} from "@/lib/klaviyo/brandLifecycle";
import { sendBrandInvitationToKlaviyo } from "@/lib/klaviyo/brandInvitations";

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
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  await requireAdminSession();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
 const sendEmail = body.sendEmail !== false;

  const app = await prisma.brandApplication.findUnique({
  where: { id },
  select: {
    id: true,
    status: true,
    email: true,
    website: true,
    socialMedia: true,
    companyName: true,
    countryCode: true,
    city: true,
    firstName: true,
    lastName: true,
    phone: true,
  },
});

  if (!app) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (String(app.status).toLowerCase() !== "contract_signed") {
    return NextResponse.json(
      { ok: false, error: "Contract must be signed before onboarding." },
      { status: 400 }
    );
  }

  const email = app.email.trim().toLowerCase();

  const contactName = [app.firstName, app.lastName]
  .map((x) => String(x ?? "").trim())
  .filter(Boolean)
  .join(" ") || null;

const contactPhone = String(app.phone ?? "").trim() || null;

  const brandName =
    String(app.companyName ?? "").trim() || guessBrandNameFromWebsite(app.website);

  const brandSlug = slugify(brandName);

  const countryCode =
    String(app.countryCode ?? "").trim().toUpperCase() || null;

  const city = String(app.city ?? "").trim() || null;

  const baseRegion = countryCode ? regionFromCountry(countryCode) : null;

  const websiteUrl = String(app.website ?? "").trim() || null;

    // Generate the invitation token before starting the transaction.
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(rawToken);

  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7
  );

  let result;

  try {
    result = await prisma.$transaction(async (tx) => {
      // Verify that the application is still eligible.
      const currentApplication = await tx.brandApplication.findUnique({
        where: { id: app.id },
        select: { status: true },
      });

      if (currentApplication?.status !== "contract_signed") {
        throw new Error("APPLICATION_NOT_ELIGIBLE");
      }

      // Never attach an owner invitation to an existing brand
      // merely because its slug matches.
      const existingBrand = await tx.brand.findUnique({
        where: { slug: brandSlug },
        select: { id: true },
      });

      if (existingBrand) {
        throw new Error("BRAND_SLUG_CONFLICT");
      }

      const brand = await tx.brand.create({
        data: {
          slug: brandSlug,
          name: brandName,
          baseCountryCode: countryCode,
          baseRegion,
          baseCity: city,
          websiteUrl,
          billingEmail: email,
          contactName,
          contactEmail: email,
          contactPhone,
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      const invite = await tx.brandInvite.create({
        data: {
          email,
          tokenHash,
          brandId: brand.id,
          applicationId: app.id,
          role: Role.owner,
          expiresAt,
        },
        select: {
          id: true,
        },
      });

      return { brand, invite };
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "APPLICATION_NOT_ELIGIBLE"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Contract must be signed before onboarding.",
        },
        { status: 400 }
      );
    }

    if (
      (error instanceof Error &&
        error.message === "BRAND_SLUG_CONFLICT") ||
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A brand with this name already exists. Please review the existing brand before issuing an owner invitation.",
        },
        { status: 409 }
      );
    }

    throw error;
  }

  const { brand, invite } = result;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const onboardingUrl = `${siteUrl}/brand/onboarding?token=${rawToken}`;

  if (sendEmail) {
  try {
    await sendBrandInvitationToKlaviyo({
      inviteId: invite.id,
      email,
      brandName: brand.name,
      onboardingUrl,
      expiresAt,
    });

    console.log(
      "[brand-app invite] Klaviyo invitation event accepted"
    );
  } catch (error) {
    console.error(
      "[brand-app invite] Klaviyo invitation event failed",
      error
    );
  }
}


  try {
  await syncBrandProfileToKlaviyo({
    applicationId: app.id,

    firstName: app.firstName,
    lastName: app.lastName,
    email: app.email,

    companyName: app.companyName,
    phone: app.phone,
    website: app.website,
    socialMedia: app.socialMedia,

    countryCode: app.countryCode,
    city: app.city,

    stage: "contract_signed",
  });

  console.log(
    "[brand-app invite] Klaviyo profile synced",
    app.email,
    "contract_signed"
  );
} catch (e) {
  console.error(
    "[brand-app invite] Klaviyo profile sync failed",
    e
  );
}

  return NextResponse.json({
    ok: true,
    onboardingUrl,
    brand,
    expiresAt,
  });
}