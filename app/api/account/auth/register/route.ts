import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import {
  validatePassword,
} from "@/lib/auth/passwordStrength";
import {
  createShopperSession,
  setShopperSessionCookie,
} from "@/lib/auth/ShopperSession";

import {
  generateShopperEmailVerificationCode,
  hashShopperEmailVerificationCode,
  getShopperEmailVerificationExpiry,
} from "@/lib/auth/shopperEmailVerificationCode";

import {
  sendShopperEmailVerificationCode,
} from "@/lib/email/sendShopperEmailVerificationCode";

import {
  ShopperSessionCreationReason,
} from "@prisma/client";

export async function POST(
  req: NextRequest
) {
  try {

    const selectedCountry =
  req.cookies
    .get("vc_country")
    ?.value
    ?.trim()
    .toUpperCase() ||
  null;

    const {
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
    } = await req.json();

    /*
     * Required fields
     */
    if (
      !email ||
      !password ||
      !dateOfBirth
    ) {
      return NextResponse.json(
        {
          error:
            "Email, password and date of birth are required.",
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
  validatePassword(password);

if (!passwordValidation.ok) {
  return NextResponse.json(
    {
      error:
        passwordValidation.errors[0] ??
        "Password does not meet the password requirements.",
      errors:
        passwordValidation.errors,
    },
    {
      status: 400,
    }
  );
}

    /*
     * ─────────────────────────────
     * Date of birth validation
     * ─────────────────────────────
     */

    const parsedDateOfBirth =
      new Date(
        `${dateOfBirth}T00:00:00.000Z`
      );

    if (
      Number.isNaN(
        parsedDateOfBirth.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid date of birth.",
        },
        {
          status: 400,
        }
      );
    }

    const today =
      new Date();

    let age =
      today.getUTCFullYear() -
      parsedDateOfBirth.getUTCFullYear();

    const monthDifference =
      today.getUTCMonth() -
      parsedDateOfBirth.getUTCMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getUTCDate() <
          parsedDateOfBirth.getUTCDate()
      )
    ) {
      age -= 1;
    }

    if (
      age < 13
    ) {
      return NextResponse.json(
        {
          error:
            "You must be at least 13 years old to create a Veilora account.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Existing shopper check
     */
    const existing =
      await prisma.shopper.findUnique({
        where: {
          email:
            email
              .toLowerCase()
              .trim(),
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * Hash password
     */
    const hashed =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * Create shopper
     */
    const verificationCode =
      generateShopperEmailVerificationCode();

    const shopper =
      await prisma.$transaction(async (tx) => {
        const createdShopper =
          await tx.shopper.create({
            data: {

          email:
            email
              .toLowerCase()
              .trim(),

          password:
            hashed,

          firstName:
            firstName?.trim() ||
            null,

          lastName:
            lastName?.trim() ||
            null,

          /*
           * THIS is what
           * dateOfBirth:
           * parsedDateOfBirth
           * means.
           *
           * It saves the validated
           * Date object into Prisma.
           */
          dateOfBirth:
            parsedDateOfBirth,

            countryCode:
  selectedCountry,
            },
          });

        await tx.shopperEmailVerification.create({
          data: {
            shopperId: createdShopper.id,
            email: createdShopper.email,
            codeHash: hashShopperEmailVerificationCode(
              verificationCode,
              createdShopper.id,
              createdShopper.email
            ),
            expiresAt:
              getShopperEmailVerificationExpiry(),
          },
        });

        return createdShopper;
      });

    /*
     * Send verification code after the
     * shopper and challenge are committed.
     */
    try {
      await sendShopperEmailVerificationCode({
        to: shopper.email,
        firstName: shopper.firstName,
        code: verificationCode,
      });
    } catch (emailError) {
      console.error(
        "[shopper-verification-email]",
        emailError
      );

      /*
       * Email delivery failed.
       *
       * Invalidate this specific challenge
       * while preserving the shopper account.
       */
      try {
        await prisma.shopperEmailVerification.updateMany({
          where: {
            shopperId: shopper.id,
            email: shopper.email,
            codeHash:
              hashShopperEmailVerificationCode(
                verificationCode,
                shopper.id,
                shopper.email
              ),
            status: "PENDING",
          },
          data: {
            status: "SUPERSEDED",
          },
        });
      } catch (invalidationError) {
        console.error(
          "[shopper-verification-invalidation]",
          invalidationError
        );
      }
    }

    const res =
      NextResponse.json({
        ok: true,
        shopperId:
          shopper.id,
      });

    /*
 * Create a revocable server-side
 * session for the newly registered
 * shopper.
 */
const session =
  await createShopperSession(
    shopper.id,
    ShopperSessionCreationReason.REGISTRATION
  );

setShopperSessionCookie(
  res,
  session.token
);

    return res;
  } catch (error) {
    console.error(
      "[shopper-register]",
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