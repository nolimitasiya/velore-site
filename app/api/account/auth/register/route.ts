import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import {
  sendShopperWelcomeEmail,
} from "@/lib/email/sendShopperWelcomeEmail";

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
     * Password validation
     */
    if (
      password.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters.",
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
    const shopper =
      await prisma.shopper.create({
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

    /*
     * Welcome email
     */
    sendShopperWelcomeEmail({
      to:
        shopper.email,

      firstName:
        shopper.firstName,
    }).catch(
      (err) =>
        console.error(
          "[welcome-email]",
          err
        )
    );

    const res =
      NextResponse.json({
        ok: true,
        shopperId:
          shopper.id,
      });

    res.cookies.set(
      "shopper_authed",
      shopper.id,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge:
          60 *
          60 *
          24 *
          30,
      }
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