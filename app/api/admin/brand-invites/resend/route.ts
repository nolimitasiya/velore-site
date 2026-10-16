import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { sendBrandInvitationToKlaviyo } from "@/lib/klaviyo/brandInvitations";
import { getBrandOnboardingUrl } from "@/lib/brandInvites/onboardingUrl";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const inviteId = String(body.inviteId || "").trim();

    if (!inviteId) {
      return NextResponse.json(
        { ok: false, error: "Missing inviteId" },
        { status: 400 }
      );
    }

    const existingInvite = await prisma.brandInvite.findUnique({
      where: { id: inviteId },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingInvite) {
      return NextResponse.json(
        { ok: false, error: "Invitation not found" },
        { status: 404 }
      );
    }

if (existingInvite.usedAt || existingInvite.expiresAt <= new Date()) {
  return NextResponse.json(
    {
      ok: false,
      error: "Invitation has already been used or has expired.",
    },
    { status: 409 },
  );
}

const rawToken = crypto.randomBytes(32).toString("hex");
const tokenHash = sha256(rawToken);
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const onboardingUrl = getBrandOnboardingUrl(rawToken);

const replacementInvite = await prisma.$transaction(async (tx) => {
  const claimed = await tx.brandInvite.updateMany({
    where: {
      id: existingInvite.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      usedAt: new Date(),
    },
  });

  if (claimed.count !== 1) {
    throw new Error("INVITATION_NO_LONGER_AVAILABLE");
  }

  return tx.brandInvite.create({
   data: {
    email: existingInvite.email,
    brandId: existingInvite.brandId,
    applicationId: existingInvite.applicationId,
    role: existingInvite.role,
    tokenHash,
    expiresAt,
  },
});
});

    try {
      await sendBrandInvitationToKlaviyo({
        inviteId: replacementInvite.id,
        email: replacementInvite.email,
        brandName: existingInvite.brand.name,
        onboardingUrl,
        expiresAt,
      });
    } catch (error) {
      console.error(
        "[admin-brand-invite-resend] Klaviyo event failed",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          inviteCreated: true,
          inviteId: replacementInvite.id,
          error:
            "Replacement invitation created and previous invitation invalidated, but Klaviyo did not accept the event.",
          onboardingUrl,
          expiresAt,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      inviteId: replacementInvite.id,
      onboardingUrl,
      expiresAt,
      eventAccepted: true,
    });
  } catch (error) {
  if (
    error instanceof Error &&
    error.message === "INVITATION_NO_LONGER_AVAILABLE"
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invitation has already been used, replaced or expired.",
      },
      { status: 409 },
    );
  }

  console.error("[admin-brand-invite-resend] error", error);

  return NextResponse.json(
    {
      ok: false,
      error: "Failed to create replacement invitation.",
    },
    { status: 500 },
  );
}
}