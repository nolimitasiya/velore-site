import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

import {
  ANALYTICS_SESSION_COOKIE,
} from "@/lib/analytics/session";

export async function POST(
  req: NextRequest
) {
  try {
    const {
      email,
      password,
    } = await req.json();

    if (
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    const shopper =
      await prisma.shopper.findUnique({
        where: {
          email:
            email
              .toLowerCase()
              .trim(),
        },
      });

    if (!shopper) {
      return NextResponse.json(
        {
          error:
            "Incorrect email or password.",
        },
        {
          status: 401,
        }
      );
    }

    const valid =
      await bcrypt.compare(
        password,
        shopper.password
      );

    if (!valid) {
      return NextResponse.json(
        {
          error:
            "Incorrect email or password.",
        },
        {
          status: 401,
        }
      );
    }

    const res =
      NextResponse.json({
        ok: true,
        shopperId:
          shopper.id,
      });

    /*
     * Authenticate shopper.
     */
    res.cookies.set(
      "shopper_authed",
      shopper.id,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite:
          "lax",
        path:
          "/",
        maxAge:
          60 *
          60 *
          24 *
          30,
      }
    );

    /*
     * Authentication changes the
     * analytics identity.
     *
     * Remove the previous analytics
     * session cookie so the next
     * tracked event creates a fresh
     * session belonging to this
     * shopper.
     */
    res.cookies.set(
      ANALYTICS_SESSION_COOKIE,
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite:
          "lax",
        path:
          "/",
        maxAge:
          0,
      }
    );

    return res;
  } catch (error) {
    console.error(
      "Shopper login failed",
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