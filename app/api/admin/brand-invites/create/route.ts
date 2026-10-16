// app/api/admin/brand-invites/create/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { sendBrandInvitationToKlaviyo } from "@/lib/klaviyo/brandInvitations";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { regionFromCountry } from "@/lib/geo";
import { getBrandOnboardingUrl } from "@/lib/brandInvites/onboardingUrl";

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
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
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

    // This endpoint creates invitations for NEW brands only.
// Never attach an invitation to an existing brand based on its slug.
const rawToken = crypto.randomBytes(32).toString("hex");
const tokenHash = sha256(rawToken);
const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

let result: {
  brand: {
    id: string;
    slug: string;
    name: string;
  };
  invite: {
    id: string;
  };
};

try {
  result = await prisma.$transaction(async (tx) => {
    // Never attach a new-brand invitation to an existing brand.
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
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    const invite = await tx.brandInvite.create({
      data: {
        email,
        tokenHash,
        brandId: brand.id,
        role,
        expiresAt,
      },
      select: { id: true },
    });

    return { brand, invite };
  });
} catch (error) {
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
        error: "A brand with this slug already exists.",
      },
      { status: 409 }
    );
  }

  throw error;
}

const { brand, invite } = result;

const onboardingUrl = getBrandOnboardingUrl(rawToken);
try {
  await sendBrandInvitationToKlaviyo({
    inviteId: invite.id,
    email,
    brandName: brand.name,
    onboardingUrl,
    expiresAt,
  });
} catch (error) {
  console.error("[admin-brand-invite-create] Klaviyo event failed", error);

  return NextResponse.json(
    {
      ok: false,
      inviteCreated: true,
      inviteId: invite.id,
      error:
        "Invitation was created, but Klaviyo did not accept the invitation event.",
      onboardingUrl,
      expiresAt,
    },
    { status: 502 }
  );
}

return NextResponse.json({
  ok: true,
  inviteId: invite.id,
  brand,
  onboardingUrl,
  expiresAt,
  eventAccepted: true,
});
    } catch (error) {
    console.error("[admin-brand-invite-create] error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create invitation.",
      },
      { status: 500 }
    );
  }
}
