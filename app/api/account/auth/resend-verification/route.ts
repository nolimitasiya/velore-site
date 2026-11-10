import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  Prisma,
  ShopperEmailVerificationStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  requireAuthenticatedShopper,
} from "@/lib/auth/ShopperSession";

import {
  generateShopperEmailVerificationCode,
  hashShopperEmailVerificationCode,
  getShopperEmailVerificationExpiry,
  getShopperEmailVerificationRetryAfterSeconds,
  SHOPPER_EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES,
} from "@/lib/auth/shopperEmailVerificationCode";

import {
  sendShopperEmailVerificationCode,
} from "@/lib/email/sendShopperEmailVerificationCode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authenticatedShopper =
      await requireAuthenticatedShopper(req);

    const shopper =
      await prisma.shopper.findUnique({
        where: {
          id: authenticatedShopper.id,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          emailVerifiedAt: true,
        },
      });

    if (!shopper) {
      return NextResponse.json(
        { error: "Shopper account not found." },
        { status: 404 }
      );
    }

    if (shopper.emailVerifiedAt) {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
      });
    }

    const code =
      generateShopperEmailVerificationCode();

    const result = await prisma.$transaction(
      async (tx) => {
        const now = new Date();

        const currentShopper =
          await tx.shopper.findUnique({
            where: {
              id: shopper.id,
            },
            select: {
              email: true,
              emailVerifiedAt: true,
            },
          });

        if (
          !currentShopper ||
          currentShopper.email !== shopper.email
        ) {
          return {
            status: "ACCOUNT_CHANGED" as const,
          };
        }

        if (currentShopper.emailVerifiedAt) {
          return {
            status: "ALREADY_VERIFIED" as const,
          };
        }

        const latest =
          await tx.shopperEmailVerification.findFirst({
            where: {
              shopperId: shopper.id,
              email: shopper.email,
            },
            orderBy: [
              { sentAt: "desc" },
              { createdAt: "desc" },
            ],
            select: {
              sentAt: true,
            },
          });

        if (latest) {
          const retryAfterSeconds =
            getShopperEmailVerificationRetryAfterSeconds(
              latest.sentAt,
              now
            );

          if (retryAfterSeconds > 0) {
            return {
              status: "COOLDOWN" as const,
              retryAfterSeconds,
            };
          }
        }

        await tx.shopperEmailVerification.updateMany({
          where: {
            shopperId: shopper.id,
            status:
              ShopperEmailVerificationStatus.PENDING,
          },
          data: {
            status:
              ShopperEmailVerificationStatus.SUPERSEDED,
          },
        });

        const challenge =
          await tx.shopperEmailVerification.create({
            data: {
              shopperId: shopper.id,
              email: shopper.email,
              codeHash:
                hashShopperEmailVerificationCode(
                  code,
                  shopper.id,
                  shopper.email
                ),
              expiresAt:
                getShopperEmailVerificationExpiry(
                  now
                ),
              sentAt: now,
            },
            select: {
              id: true,
            },
          });

        return {
          status: "CREATED" as const,
          challengeId: challenge.id,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    if (result.status === "ALREADY_VERIFIED") {
      return NextResponse.json({
        ok: true,
        alreadyVerified: true,
      });
    }

    if (result.status === "ACCOUNT_CHANGED") {
      return NextResponse.json(
        {
          error:
            "Your account details changed. Please try again.",
        },
        { status: 409 }
      );
    }

    if (result.status === "COOLDOWN") {
      return NextResponse.json(
        {
          error:
            `Please wait ${result.retryAfterSeconds} seconds before requesting another code.`,
          retryAfterSeconds:
            result.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(result.retryAfterSeconds),
          },
        }
      );
    }

    try {
      await sendShopperEmailVerificationCode({
        to: shopper.email,
        firstName: shopper.firstName,
        code,
      });
    } catch (emailError) {
      console.error(
        "[shopper-verification-resend-email]",
        emailError
      );

      await prisma.shopperEmailVerification.updateMany({
        where: {
          id: result.challengeId,
          shopperId: shopper.id,
          status:
            ShopperEmailVerificationStatus.PENDING,
        },
        data: {
          status:
            ShopperEmailVerificationStatus.SUPERSEDED,
        },
      });

      return NextResponse.json(
        {
          error:
            "We couldn't send your verification email. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      expiresInSeconds:
        SHOPPER_EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES *
        60,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "UNAUTHENTICATED_SHOPPER"
    ) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        {
          error:
            "Your request could not be completed. Please try again.",
        },
        { status: 409 }
      );
    }

    console.error(
      "[shopper-verification-resend]",
      error
    );

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}