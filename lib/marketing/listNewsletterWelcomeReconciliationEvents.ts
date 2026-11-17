import "server-only";

import type { PrismaClient } from "@prisma/client";

type ReconciliationDatabase = Pick<
  PrismaClient,
  "newsletterWelcomeEvent"
>;

export async function listNewsletterWelcomeReconciliationEvents(
  db: ReconciliationDatabase
) {
  return db.newsletterWelcomeEvent.findMany({
    where: {
      status: "UNKNOWN",
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
    take: 50,
    select: {
      id: true,
      eventKey: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      submittedAt: true,
      providerMessageId: true,
      subscriber: {
        select: {
          email: true,
        },
      },
      _count: {
        select: {
          reconciliationAudits: true,
        },
      },
    },
  });
}