import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createBrandSession } from "@/lib/auth/brandDbSession";
import { validatePassword } from "@/lib/auth/passwordStrength";
import {
  sendBrandLifecycleEventToKlaviyo,
  syncBrandProfileToKlaviyo,
} from "@/lib/klaviyo/brandLifecycle";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = String(searchParams.get("token") || "").trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing token" },
      { status: 400 },
    );
  }

  const tokenHash = sha256(token);

  const invite = await prisma.brandInvite.findUnique({
    where: { tokenHash },
    select: {
      email: true,
      expiresAt: true,
      usedAt: true,
      brand: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "Invalid invite link" },
      { status: 400 },
    );
  }

  if (invite.usedAt) {
    return NextResponse.json(
      { ok: false, error: "Invite already used" },
      { status: 400 },
    );
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "Invite expired" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    email: invite.email,
    brandName: invite.brand.name,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const token = String(body.token || "").trim();
  const password = String(body.password || "");
  const email = String(body.email || "").trim().toLowerCase();

  if (!token || !password) {
  return NextResponse.json(
    { ok: false, error: "Missing token/password" },
    { status: 400 },
  );
}

const passwordValidation = validatePassword(password);

if (!passwordValidation.ok) {
  return NextResponse.json(
    {
      ok: false,
      error: "WEAK_PASSWORD",
      details: passwordValidation.errors,
    },
    { status: 400 },
  );
}

const tokenHash = sha256(token);

  const invite = await prisma.brandInvite.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      brandId: true,
      role: true,
      expiresAt: true,
      usedAt: true,
      applicationId: true,
    },
  });

  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "Invalid invite link" },
      { status: 400 }
    );
  }

  if (invite.usedAt) {
    return NextResponse.json(
      { ok: false, error: "Invite already used" },
      { status: 400 }
    );
  }

  if (invite.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: "Invite expired" },
      { status: 400 }
    );
  }

  const invitedEmail = invite.email.trim().toLowerCase();

  if (email && email !== invitedEmail) {
    return NextResponse.json(
      {
        ok: false,
        error: "Email address does not match the invitation.",
      },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invitedEmail },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "An account already exists with this email address. Please contact support to connect your existing account to this brand.",
      },
      { status: 409 }
    );
  }

  const hash = await bcrypt.hash(password, 12);

  let sessionToken: string;

  try {
    sessionToken = await prisma.$transaction(async (tx) => {
      // Claim the invitation only if it is still unused and valid.
      const claimed = await tx.brandInvite.updateMany({
        where: {
          id: invite.id,
          tokenHash,
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          usedAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        throw new Error("INVITATION_ALREADY_CLAIMED");
      }

      // Never update an existing account's password.
      const createdUser = await tx.user.create({
        data: {
          email: invitedEmail,
          name: null,
          password: hash,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Connect the new user to the invited brand.
await tx.brandMembership.create({
  data: {
    userId: createdUser.id,
    brandId: invite.brandId,
    role: invite.role,
  },
});

// Create the login session inside the same transaction.
// If this fails, the invitation claim, user creation,
// and membership creation are rolled back.
const token = await createBrandSession(createdUser.id, tx);

// Application-based invitations complete the application lifecycle.
// Generic invitations have no applicationId and skip this step.
if (invite.applicationId) {
  const updated = await tx.brandApplication.updateMany({
    where: {
      id: invite.applicationId,
      status: "contract_signed",
    },
    data: {
      status: "onboarded",
    },
  });

  if (updated.count !== 1) {
    throw new Error("APPLICATION_NOT_ELIGIBLE_FOR_ONBOARDING");
  }
}

return token;
    });
  } catch (error) {
    if (
  error instanceof Error &&
  error.message === "APPLICATION_NOT_ELIGIBLE_FOR_ONBOARDING"
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "This application is no longer eligible for onboarding. Please contact support.",
    },
    { status: 409 }
  );
}
    // A failed transaction rolls back the invitation claim,
    // user creation and membership creation together.
    if (
      error instanceof Error &&
      error.message === "INVITATION_ALREADY_CLAIMED"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "This invitation has already been used or has expired.",
        },
        { status: 409 }
      );
    }

    // Prisma unique-constraint violation.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "An account already exists with this email address. Please contact support.",
        },
        { status: 409 }
      );
    }

    console.error("[Brand onboarding] Transaction failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to complete onboarding. Please try again.",
      },
      { status: 500 }
    );
  }

// Notify Klaviyo only after the onboarding transaction commits.
// A Klaviyo failure must not undo successful account creation.
if (invite.applicationId) {
  try {
    const application = await prisma.brandApplication.findUnique({
      where: { id: invite.applicationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        companyName: true,
        phone: true,
        website: true,
        socialMedia: true,
        countryCode: true,
        city: true,
      },
    });

    if (application) {
      const lifecycleDetails = {
        applicationId: application.id,
        firstName: application.firstName,
        lastName: application.lastName,
        email: application.email,
        companyName: application.companyName,
        phone: application.phone,
        website: application.website,
        socialMedia: application.socialMedia,
        countryCode: application.countryCode,
        city: application.city,
        stage: "onboarded" as const,
      };

      try {
        await syncBrandProfileToKlaviyo(lifecycleDetails);
      } catch (error) {
        console.error(
          "[Brand onboarding] Klaviyo profile sync failed",
          error
        );
      }

      try {
        await sendBrandLifecycleEventToKlaviyo({
          ...lifecycleDetails,
          eventName: "Brand Onboarded",
        });
      } catch (error) {
        console.error(
          "[Brand onboarding] Klaviyo lifecycle event failed",
          error
        );
      }
    }
  } catch (error) {
    console.error(
      "[Brand onboarding] Unable to load application lifecycle details",
      error
    );
  }
}

const res = NextResponse.json({ ok: true });

  res.cookies.set("brand_authed", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  res.cookies.set("brand_id", invite.brandId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  res.cookies.set("user_authed", "", {
    path: "/",
    maxAge: 0,
  });

  res.cookies.set("company_id", "", {
    path: "/",
    maxAge: 0,
  });

  return res;
}