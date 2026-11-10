import "server-only";

import { prisma } from "@/lib/prisma";
import { getShopperWelcomeEmailRolloutAt } from "@/lib/email/shopperWelcomeEmailRollout";

import {
  processShopperWelcomeEmail,
} from "@/lib/email/processShopperWelcomeEmail";

const BATCH_SIZE = 3;
const MAX_ATTEMPTS = 5;

type DispatchSummary = {
  examined: number;
  sent: number;
  failed: number;
  skipped: number;
};

export async function dispatchShopperWelcomeEmails(): Promise<DispatchSummary> {
  const rolloutAt = getShopperWelcomeEmailRolloutAt();

  if (!rolloutAt) {
    return {
      examined: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const now = new Date();

  const eligible = await prisma.shopper.findMany({
    where: {
      createdAt: {
        gte: rolloutAt,
      },
      emailVerifiedAt: {
        not: null,
      },
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
          welcomeEmailStatus: "PENDING",
        },
        {
          welcomeEmailStatus: "FAILED",
          welcomeEmailNextAttemptAt: {
            lte: now,
          },
        },
      ],
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: BATCH_SIZE,
  });

  const summary: DispatchSummary = {
    examined: eligible.length,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  for (const shopper of eligible) {
    const result =
      await processShopperWelcomeEmail(shopper.id);

    switch (result) {
      case "SENT":
        summary.sent++;
        break;
      case "FAILED":
        summary.failed++;
        break;
      case "SKIPPED":
        summary.skipped++;
        break;
    }
  }

  return summary;
}