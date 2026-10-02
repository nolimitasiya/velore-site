import {
  NextRequest,
  NextResponse,
} from "next/server";

import bcrypt from "bcryptjs";

import {
  ShopperSessionCreationReason,
  ShopperSessionRevocationReason,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  createShopperSession,
  requireAuthenticatedShopper,
  setShopperSessionCookie,
} from "@/lib/auth/ShopperSession";
import {
  validatePassword,
} from "@/lib/auth/passwordStrength";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest
) {
  try {
    const authenticatedShopper =
      await requireAuthenticatedShopper(
        req
      );

    const body =
      await req.json();

    const currentPassword =
      typeof body.currentPassword ===
      "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmPassword =
      typeof body.confirmPassword ===
      "string"
        ? body.confirmPassword
        : "";

    /*
     * Required fields
     */
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "Current password, new password and confirmation are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
 * Apply Veilora's canonical password
 * policy.
 */
const passwordValidation =
  validatePassword(newPassword);

if (!passwordValidation.ok) {
  return NextResponse.json(
    {
      error:
        passwordValidation.errors[0] ??
        "New password does not meet the password requirements.",
      errors:
        passwordValidation.errors,
    },
    {
      status: 400,
    }
  );
}

    if (
      newPassword !== confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            "New passwords do not match.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Load the password hash from the
     * authenticated shopper account.
     */
    const shopper =
      await prisma.shopper.findUnique({
        where: {
          id: authenticatedShopper.id,
        },
        select: {
          id: true,
          password: true,
        },
      });

    if (!shopper) {
      return NextResponse.json(
        {
          error:
            "Shopper account not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Verify the shopper knows their
     * existing password.
     */
    const currentPasswordValid =
      await bcrypt.compare(
        currentPassword,
        shopper.password
      );

    if (!currentPasswordValid) {
      return NextResponse.json(
        {
          error:
            "Current password is incorrect.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Prevent a no-op password change.
     */
    const samePassword =
      await bcrypt.compare(
        newPassword,
        shopper.password
      );

    if (samePassword) {
      return NextResponse.json(
        {
          error:
            "Your new password must be different from your current password.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Match registration:
     * bcrypt cost factor 12.
     */
    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      );

    /*
 * Password changes are security-sensitive.
 *
 * Update the credential and revoke every
 * existing shopper session atomically.
 */
await prisma.$transaction(
  async (tx) => {
    await tx.shopper.update({
      where: {
        id: shopper.id,
      },
      data: {
        password:
          hashedPassword,
      },
    });

    await tx.shopperAuthSession.updateMany({
      where: {
        shopperId:
          shopper.id,
        revokedAt:
          null,
      },
      data: {
        revokedAt:
          new Date(),
        revocationReason:
          ShopperSessionRevocationReason.PASSWORD_CHANGED,
      },
    });
  }
);

/*
 * The browser performing the password
 * change receives a fresh session.
 *
 * Other browsers remain revoked.
 */
const session = await createShopperSession(
  shopper.id,
  ShopperSessionCreationReason.PASSWORD_CHANGE
);

const response =
  NextResponse.json({
    ok: true,
    message:
      "Your password has been updated.",
  });

setShopperSessionCookie(
  response,
  session.token
);

return response;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "UNAUTHENTICATED_SHOPPER"
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    console.error(
      "[shopper-password-update]",
      error
    );

    return NextResponse.json(
      {
        error:
          "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}