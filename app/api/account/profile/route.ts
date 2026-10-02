import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import {
  requireAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeShopper(shopper: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  countryCode: string | null;
  dateOfBirth: Date | null;
}) {
  return {
    id: shopper.id,
    email: shopper.email,
    firstName: shopper.firstName,
    lastName: shopper.lastName,
    countryCode: shopper.countryCode,
    dateOfBirth: shopper.dateOfBirth
      ? shopper.dateOfBirth
          .toISOString()
          .slice(0, 10)
      : null,
  };
}

export async function GET(
  req: NextRequest
) {
  try {
    const authenticatedShopper =
      await requireAuthenticatedShopper(
        req
      );

    const shopper =
      await prisma.shopper.findUnique({
        where: {
          id: authenticatedShopper.id,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          countryCode: true,
          dateOfBirth: true,
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

    return NextResponse.json({
      shopper:
        serializeShopper(shopper),
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
      "[shopper-profile-get]",
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

    const firstName =
      typeof body.firstName === "string"
        ? body.firstName.trim()
        : "";

    const lastName =
      typeof body.lastName === "string"
        ? body.lastName.trim()
        : "";

    if (
      firstName.length > 100 ||
      lastName.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "First and last names must be 100 characters or fewer.",
        },
        {
          status: 400,
        }
      );
    }

    const shopper =
      await prisma.shopper.update({
        where: {
          id: authenticatedShopper.id,
        },
        data: {
          firstName:
            firstName || null,
          lastName:
            lastName || null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          countryCode: true,
          dateOfBirth: true,
        },
      });

    return NextResponse.json({
      ok: true,
      shopper:
        serializeShopper(shopper),
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
      "[shopper-profile-update]",
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