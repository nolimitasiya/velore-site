import "server-only";

import { prisma } from "@/lib/prisma";

const STUCK_AFTER_MS = 5 * 60 * 1000;

export async function countStuckShopperWelcomeEmails(): Promise<number> {
  const cutoff = new Date(
    Date.now() - STUCK_AFTER_MS
  );

  return prisma.shopper.count({
    where: {
      welcomeEmailStatus: "PROCESSING",
      welcomeEmailSentAt: null,
      welcomeEmailClaimedAt: {
        lte: cutoff,
      },
    },
  });
}