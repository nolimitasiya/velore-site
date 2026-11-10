import { ShopperWelcomeEmailStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendShopperWelcomeEmail } from "@/lib/email/sendShopperWelcomeEmail";
import { getShopperWelcomeEmailRolloutAt } from "@/lib/email/shopperWelcomeEmailRollout";

const MAX_ATTEMPTS = 5;

const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  15 * 60_000,
  60 * 60_000,
];

export async function processShopperWelcomeEmail(
  shopperId: string
): Promise<"SENT" | "SKIPPED" | "FAILED"> {
  const rolloutAt = getShopperWelcomeEmailRolloutAt();

  if (!rolloutAt) {
    return "SKIPPED";
  }

  const now = new Date();

  const claimed = await prisma.shopper.updateMany({
    where: {
      id: shopperId,
      createdAt: { gte: rolloutAt },
      emailVerifiedAt: { not: null },
      emailVerifications: {
        some: {
          status: "VERIFIED",
        },
      },
      welcomeEmailSentAt: null,
      welcomeEmailAttempts: {
        lt: MAX_ATTEMPTS,
      },
      OR: [
        {
          welcomeEmailStatus:
            ShopperWelcomeEmailStatus.PENDING,
        },
        {
          welcomeEmailStatus:
            ShopperWelcomeEmailStatus.FAILED,
          welcomeEmailNextAttemptAt: {
            lte: now,
          },
        },
      ],
    },
    data: {
      welcomeEmailStatus:
        ShopperWelcomeEmailStatus.PROCESSING,
      welcomeEmailClaimedAt: now,
      welcomeEmailAttempts: {
        increment: 1,
      },
    },
  });

  if (claimed.count !== 1) {
    return "SKIPPED";
  }

  const shopper = await prisma.shopper.findUnique({
    where: { id: shopperId },
    select: {
      id: true,
      email: true,
      firstName: true,
      welcomeEmailAttempts: true,
    },
  });

  if (!shopper) {
    return "FAILED";
  }

  const claim = {
    welcomeEmailStatus:
      ShopperWelcomeEmailStatus.PROCESSING,
    welcomeEmailClaimedAt: now,
    welcomeEmailAttempts:
      shopper.welcomeEmailAttempts,
  };

  let providerId: string;

  try {
    const result = await sendShopperWelcomeEmail({
      to: shopper.email,
      firstName: shopper.firstName,
      idempotencyKey:
        `shopper-welcome-${shopper.id}`,
    });

    providerId = result.id;
  } catch (error) {
    console.error(
      "[shopper-welcome-email] Provider send failed",
      error
    );

    const retryDelay =
      RETRY_DELAYS_MS[
        Math.min(
          shopper.welcomeEmailAttempts - 1,
          RETRY_DELAYS_MS.length - 1
        )
      ];

    await prisma.shopper.updateMany({
      where: {
        id: shopper.id,
        ...claim,
      },
      data: {
        welcomeEmailStatus:
          ShopperWelcomeEmailStatus.FAILED,
        welcomeEmailClaimedAt: null,
        welcomeEmailNextAttemptAt:
          shopper.welcomeEmailAttempts >=
          MAX_ATTEMPTS
            ? null
            : new Date(Date.now() + retryDelay),
      },
    });

    return "FAILED";
  }

  try {
    const completed = await prisma.shopper.updateMany({
      where: {
        id: shopper.id,
        ...claim,
      },
      data: {
        welcomeEmailStatus:
          ShopperWelcomeEmailStatus.SENT,
        welcomeEmailSentAt: new Date(),
        welcomeEmailProviderId: providerId,
        welcomeEmailClaimedAt: null,
        welcomeEmailNextAttemptAt: null,
      },
    });

    if (completed.count !== 1) {
      console.error(
        "[shopper-welcome-email] Provider accepted the email, but the delivery claim could not be completed.",
        { shopperId: shopper.id }
      );
      return "FAILED";
    }

    return "SENT";
  } catch (error) {
    console.error(
      "[shopper-welcome-email] Provider accepted email but database recording failed",
      { shopperId: shopper.id, error }
    );

    return "FAILED";
  }
}