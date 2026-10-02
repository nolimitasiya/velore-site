import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  ShopperEmailChangeStatus,
} from "@prisma/client";

import bcrypt from "bcryptjs";
import {
  createHash,
  randomInt,
} from "crypto";

import { prisma } from "@/lib/prisma";
import {
  requireAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";
import {
  sendShopperEmailChangeCode,
} from "@/lib/email/sendShopperEmailChangeCode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_EXPIRY_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

export async function POST(
  req: NextRequest
) {
  try {
    const authenticatedShopper =
      await requireAuthenticatedShopper(req);

    const body = await req.json();

    const newEmail =
      typeof body.newEmail === "string"
        ? body.newEmail
            .toLowerCase()
            .trim()
        : "";

    const currentPassword =
      typeof body.currentPassword ===
      "string"
        ? body.currentPassword
        : "";

    if (!newEmail || !currentPassword) {
      return NextResponse.json(
        {
          error:
            "New email and current password are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Basic email shape validation.
     *
     * We don't need an overly restrictive
     * email regex here. The verification
     * email itself proves deliverability.
     */
    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(newEmail)) {
      return NextResponse.json(
        {
          error:
            "Enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Load the authenticated account,
     * including its password hash.
     */
    const shopper =
      await prisma.shopper.findUnique({
        where: {
          id: authenticatedShopper.id,
        },
        select: {
          id: true,
          email: true,
          password: true,
          firstName: true,
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
     * Re-authenticate before allowing an
     * identity/security change.
     */
    const passwordValid =
      await bcrypt.compare(
        currentPassword,
        shopper.password
      );

    if (!passwordValid) {
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
     * There is nothing to verify if the
     * requested address is already the
     * shopper's current address.
     */
    if (
      newEmail ===
      shopper.email.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "This is already your current email address.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Prevent taking an email address that
     * already belongs to another account.
     */
    const existingShopper =
      await prisma.shopper.findUnique({
        where: {
          email: newEmail,
        },
        select: {
          id: true,
        },
      });

    if (existingShopper) {
      return NextResponse.json(
        {
          error:
            "An account already exists with this email address.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Look for the most recent still-unused
     * verification request.
     *
     * This lets us enforce the resend
     * cooldown before creating another code.
     */
    const latestPending =
      await prisma.shopperEmailChange.findFirst({
        where: {
            shopperId: shopper.id,
            status: ShopperEmailChangeStatus.PENDING,
        },
        orderBy: {
          sentAt: "desc",
        },
        select: {
          sentAt: true,
        },
      });

    if (latestPending) {
      const cooldownEndsAt =
        latestPending.sentAt.getTime() +
        RESEND_COOLDOWN_SECONDS * 1000;

      const remainingMs =
        cooldownEndsAt - Date.now();

      if (remainingMs > 0) {
        const retryAfterSeconds =
          Math.ceil(
            remainingMs / 1000
          );

        return NextResponse.json(
          {
            error:
              `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
            retryAfterSeconds,
          },
          {
            status: 429,
            headers: {
              "Retry-After":
                String(
                  retryAfterSeconds
                ),
            },
          }
        );
      }
    }

    /*
     * Generate exactly six digits.
     *
     * randomInt is cryptographically secure.
     * 100000 <= code < 1000000
     */
    const code = randomInt(
      100000,
      1000000
    ).toString();

    /*
     * Never store the usable verification
     * code itself.
     */
    const codeHash = createHash(
      "sha256"
    )
      .update(code)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() +
        CODE_EXPIRY_MINUTES *
          60 *
          1000
    );

    /*
     * Invalidate previous unused requests.
     *
     * We preserve them historically rather
     * than deleting them.
     */
    await prisma.$transaction(
      async (tx) => {
        await tx.shopperEmailChange.updateMany({
  where: {
    shopperId: shopper.id,
    status: ShopperEmailChangeStatus.PENDING,
  },
  data: {
    status: "SUPERSEDED",
  },
});

        await tx.shopperEmailChange.create({
          data: {
            shopperId: shopper.id,
            newEmail,
            codeHash,
            expiresAt,
          },
        });
      }
    );

    /*
     * Only the new address receives the
     * verification code.
     */
    try {
      await sendShopperEmailChangeCode({
        to: newEmail,
        firstName: shopper.firstName,
        code,
      });
    } catch (emailError) {
      console.error(
        "[shopper-email-change-email]",
        emailError
      );

      /*
       * Invalidate the challenge if delivery
       * failed so it cannot remain active.
       */
      await prisma.shopperEmailChange.updateMany({
  where: {
    shopperId: shopper.id,
    codeHash,
    status: ShopperEmailChangeStatus.PENDING,
  },
  data: {
    status: "SUPERSEDED",
  },
});

      return NextResponse.json(
        {
          error:
            "We couldn't send the verification email. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json({
      ok: true,
      newEmail,
      expiresInSeconds:
        CODE_EXPIRY_MINUTES * 60,
    });
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
      "[shopper-email-change-request]",
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