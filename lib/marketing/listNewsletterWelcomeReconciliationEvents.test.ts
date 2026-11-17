import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

import { listNewsletterWelcomeReconciliationEvents } from "./listNewsletterWelcomeReconciliationEvents";

function makeDb() {
  const findMany = vi.fn().mockResolvedValue([]);

  const db = {
    newsletterWelcomeEvent: {
      findMany,
    },
  };

  return {
    db: db as unknown as Pick<PrismaClient, "newsletterWelcomeEvent">,
    findMany,
  };
}

describe("newsletter welcome reconciliation listing", () => {
  it("retrieves only UNKNOWN events", async () => {
    const { db, findMany } = makeDb();

    await listNewsletterWelcomeReconciliationEvents(db);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "UNKNOWN",
        },
      })
    );
  });

  it("limits the result to 50 events", async () => {
    const { db, findMany } = makeDb();

    await listNewsletterWelcomeReconciliationEvents(db);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });

  it("orders unresolved events oldest first", async () => {
    const { db, findMany } = makeDb();

    await listNewsletterWelcomeReconciliationEvents(db);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { createdAt: "asc" },
          { id: "asc" },
        ],
      })
    );
  });

  it("selects only approved event and subscriber fields", async () => {
    const { db, findMany } = makeDb();

    await listNewsletterWelcomeReconciliationEvents(db);

    const query = findMany.mock.calls[0][0];

    expect(query.select).toEqual({
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
    });

    expect(query.select.subscriber.select).not.toHaveProperty(
      "confirmToken"
    );

    expect(query.select.subscriber.select).not.toHaveProperty(
      "unsubscribeToken"
    );
  });

  it("uses only the read-only findMany operation", async () => {
    const { db, findMany } = makeDb();

    await listNewsletterWelcomeReconciliationEvents(db);

    expect(findMany).toHaveBeenCalledTimes(1);
  });
});