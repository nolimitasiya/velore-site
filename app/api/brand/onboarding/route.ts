import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createBrandSession } from "@/lib/auth/brandDbSession";

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
      { status: 400 }
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

return token;
    });
  } catch (error) {
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

 // The invitation, account, membership and session have all
// been committed successfully before setting cookies.

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