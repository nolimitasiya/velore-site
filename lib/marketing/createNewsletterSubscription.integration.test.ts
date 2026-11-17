import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

import { createNewsletterSubscription } from "./createNewsletterSubscription";

const prisma = new PrismaClient();

const createdIds: string[] = [];

function emailFor(label: string) {
  return `fictional-42hh-${label}-${randomUUID()}@example.invalid`;
}

describe("newsletter subscription PostgreSQL concurrency", () => {
  beforeAll(async () => {
    const expectedDatabase = "veilora_marketing_consent_test_20261111";

    if (
      !process.env.DATABASE_URL?.includes(expectedDatabase) ||
      !process.env.DIRECT_URL?.includes(expectedDatabase)
    ) {
      throw new Error("STOP: Isolated database URLs required.");
    }

    const identity = await prisma.$queryRaw<
      Array<{ database_name: string; server_port: number }>
    >`
      SELECT
        current_database()::text AS database_name,
        inet_server_port()::integer AS server_port
    `;

    if (
      identity.length !== 1 ||
      identity[0].database_name !== expectedDatabase ||
      identity[0].server_port !== 5432
    ) {
      throw new Error("STOP: Unexpected PostgreSQL identity.");
    }
  });

  afterAll(async () => {
    try {
      if (createdIds.length) {
        await prisma.newsletterSubscriber.deleteMany({
          where: { id: { in: createdIds } },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it("creates one subscriber under simultaneous requests", async () => {
    const email = emailFor("new");

    const results = await Promise.all([
      createNewsletterSubscription({ email }),
      createNewsletterSubscription({ email }),
    ]);

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { email },
    });

    createdIds.push(...subscribers.map((subscriber) => subscriber.id));

    expect(results).toHaveLength(2);
    expect(subscribers).toHaveLength(1);
    expect(subscribers[0].status).toBe("pending");
    expect(subscribers[0].subscriptionGeneration).toBe(0);
  });

  it("increments the generation once for concurrent reactivation", async () => {
    const email = emailFor("reactivation");

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email,
        status: "unsubscribed",
        subscriptionGeneration: 3,
      },
    });

    createdIds.push(subscriber.id);

    await Promise.all([
      createNewsletterSubscription({ email }),
      createNewsletterSubscription({ email }),
    ]);

    const updated = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });

    expect(updated.status).toBe("pending");
    expect(updated.subscriptionGeneration).toBe(4);
  });

  it("does not advance the generation for repeated pending requests", async () => {
    const email = emailFor("pending");

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email,
        status: "pending",
        subscriptionGeneration: 7,
      },
    });

    createdIds.push(subscriber.id);

    await Promise.all([
      createNewsletterSubscription({ email }),
      createNewsletterSubscription({ email }),
    ]);

    const updated = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });

    expect(updated.subscriptionGeneration).toBe(7);
    expect(updated.status).toBe("pending");
  });

  it("blocks an explicitly withdrawn account without changing its newsletter record", async () => {
    const email = emailFor("withdrawn");

    const shopper = await prisma.shopper.create({
      data: {
        email,
        password: "fictional-integration-test-not-a-real-password",
        emailVerifiedAt: new Date(),
        marketingConsent: false,
        marketingConsentVersion: 1,
      },
    });

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email,
        status: "unsubscribed",
        subscriptionGeneration: 3,
      },
    });

    createdIds.push(subscriber.id);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.shopperMarketingConsentSync.create({
          data: {
            shopperId: shopper.id,
            email,
            consentVersion: 1,
            desiredConsent: false,
            reason: "ACCOUNT_OPT_OUT",
            operationKey: `shopper-marketing-consent:${shopper.id}:1:ACCOUNT_OPT_OUT`,
            status: "PENDING",
          },
        });
      });

      await expect(
        createNewsletterSubscription({ email })
      ).rejects.toThrow(
        "Newsletter subscription blocked by account marketing consent."
      );

      const unchanged =
        await prisma.newsletterSubscriber.findUniqueOrThrow({
          where: { id: subscriber.id },
        });

      expect(unchanged.status).toBe("unsubscribed");
      expect(unchanged.subscriptionGeneration).toBe(3);
    } finally {
      await prisma.shopperMarketingConsentSync.deleteMany({
        where: { shopperId: shopper.id },
      });

      await prisma.shopper.delete({
        where: { id: shopper.id },
      });
    }
  });
  it("preserves an existing subscribed lifecycle", async () => {
    const email = emailFor("subscribed");

    const subscriber = await prisma.newsletterSubscriber.create({
      data: {
        email,
        status: "subscribed",
        subscriptionGeneration: 2,
      },
    });

    createdIds.push(subscriber.id);

    const result = await createNewsletterSubscription({ email });

    const updated = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: subscriber.id },
    });

    expect(result.sendConfirmation).toBe(false);
    expect(updated.status).toBe("subscribed");
    expect(updated.subscriptionGeneration).toBe(2);
  });
});