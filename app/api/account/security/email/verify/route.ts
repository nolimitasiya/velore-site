import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createHash } from "crypto";
import {
  Prisma,
  ShopperEmailChangeStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  requireAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;

export async function POST(
  req: NextRequest
) {
  try {
    const authenticatedShopper =
      await requireAuthenticatedShopper(req);

    const body = await req.json();

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : "";

    /*
     * Codes are always exactly six digits.
     */
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          error:
            "Enter the 6-digit verification code.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Find the newest active challenge for
     * this authenticated shopper.
     */
    const pending =
      await prisma.shopperEmailChange.findFirst({
        where: {
            shopperId:
              authenticatedShopper.id,
            status: ShopperEmailChangeStatus.PENDING,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (!pending) {
      return NextResponse.json(
        {
          error:
            "There is no active email change request. Please request a new code.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Expired codes cannot be used.
     */
    if (
  pending.expiresAt.getTime() <=
  Date.now()
) {
  await prisma.shopperEmailChange.updateMany({
    where: {
      id: pending.id,
      status: ShopperEmailChangeStatus.PENDING,
    },
    data: {
      status: ShopperEmailChangeStatus.EXPIRED,
    },
  });

  return NextResponse.json(
        {
          error:
            "This verification code has expired. Please request a new one.",
        },
        {
          status: 400,
        }
      );
    }

   /*
 * Stop accepting guesses after the
 * maximum number of failed attempts.
 */
if (
  pending.attemptCount >=
  MAX_ATTEMPTS
) {
  await prisma.shopperEmailChange.updateMany({
    where: {
      id: pending.id,
      status: ShopperEmailChangeStatus.PENDING,
    },
    data: {
      status: ShopperEmailChangeStatus.LOCKED,
    },
  });

  return NextResponse.json(
    {
      error:
        "Too many incorrect attempts. Please request a new code.",
    },
    {
      status: 429,
    }
  );
}

    const submittedCodeHash =
      createHash("sha256")
        .update(code)
        .digest("hex");

    /*
     * Incorrect code:
     *
     * Increment attemptCount atomically
     * rather than reading + writing the
     * next value ourselves.
     */
    if (
      submittedCodeHash !==
      pending.codeHash
    ) {
      const updated =
        await prisma.shopperEmailChange.update({
          where: {
            id: pending.id,
          },
          data: {
            attemptCount: {
              increment: 1,
            },
          },
          select: {
            attemptCount: true,
          },
        });

      const attemptsRemaining =
        Math.max(
          0,
          MAX_ATTEMPTS -
            updated.attemptCount
        );

      if (attemptsRemaining === 0) {
  await prisma.shopperEmailChange.updateMany({
    where: {
      id: pending.id,
      status: ShopperEmailChangeStatus.PENDING,
    },
    data: {
      status: ShopperEmailChangeStatus.LOCKED,
    },
  });

  return NextResponse.json(
          {
            error:
              "Too many incorrect attempts. Please request a new code.",
            attemptsRemaining: 0,
          },
          {
            status: 429,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "That verification code is incorrect.",
          attemptsRemaining,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Correct code.
     *
     * Re-check email ownership at the exact
     * moment we are about to change it.
     *
     * This matters because another account
     * could theoretically claim the address
     * after the code was originally sent.
     */
    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Re-read the challenge inside
             * the transaction.
             */
            const challenge =
              await tx.shopperEmailChange.findUnique({
                where: {
                  id: pending.id,
                },
              });

            if (
              !challenge ||
              challenge.shopperId !==
                authenticatedShopper.id ||
              challenge.status !== ShopperEmailChangeStatus.PENDING ||
              challenge.expiresAt.getTime() <=
                Date.now() ||
              challenge.attemptCount >=
                MAX_ATTEMPTS ||
              challenge.codeHash !==
                submittedCodeHash
            ) {
              throw new Error(
                "EMAIL_CHANGE_INVALID"
              );
            }

            const shopper =
              await tx.shopper.findUnique({
                where: {
                  id: authenticatedShopper.id,
                },
                select: {
                  id: true,
                  email: true,
                },
              });

            if (!shopper) {
              throw new Error(
                "SHOPPER_NOT_FOUND"
              );
            }

            /*
             * Check uniqueness again inside
             * the final transaction.
             */
            const existingOwner =
              await tx.shopper.findUnique({
                where: {
                  email:
                    challenge.newEmail,
                },
                select: {
                  id: true,
                },
              });

            if (
              existingOwner &&
              existingOwner.id !==
                shopper.id
            ) {
              throw new Error(
                "EMAIL_ALREADY_IN_USE"
              );
            }

            /*
             * Mark the challenge as consumed
             * and update the actual login
             * identifier together.
             */
            const updatedShopper =
              await tx.shopper.update({
                where: {
                  id: shopper.id,
                },
                data: {
                  email:
                    challenge.newEmail,
                },
                select: {
                  email: true,
                },
              });

            await tx.shopperEmailChange.update({
              where: {
                id: challenge.id,
              },
              data: {
                status: ShopperEmailChangeStatus.VERIFIED,
                usedAt: new Date(),
              },
            });

            return updatedShopper;
          }
        );

      return NextResponse.json({
        ok: true,
        email: result.email,
        message:
          "Your email address has been updated.",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "EMAIL_CHANGE_INVALID"
      ) {
        return NextResponse.json(
          {
            error:
              "This email change request is no longer valid. Please request a new code.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        error instanceof Error &&
        error.message ===
          "SHOPPER_NOT_FOUND"
      ) {
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

      if (
        error instanceof Error &&
        error.message ===
          "EMAIL_ALREADY_IN_USE"
      ) {
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
       * Shopper.email is @unique.
       *
       * The database remains the final
       * authority if two requests race for
       * the same email address.
       */
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
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

      throw error;
    }
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
      "[shopper-email-change-verify]",
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