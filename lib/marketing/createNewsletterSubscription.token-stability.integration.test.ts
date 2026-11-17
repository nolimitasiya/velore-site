import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

vi.mock("server-only", () => ({}));

import { createNewsletterSubscription } from "./createNewsletterSubscription";

const prisma = new PrismaClient();

const expectedDatabase = "veilora_marketing_consent_test_20261111";

const createdIds: string[] = [];

describe("newsletter pending confirmation token stability", () => {
  beforeAll(async () => {
    for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
      const value = process.env[name];

      if (!value) {
        throw new Error(`STOP: ${name} is missing.`);
      }

      const url = new URL(value);

      if (
        !["postgresql:", "postgres:"].includes(url.protocol) ||
        url.hostname !== "127.0.0.1" ||
        url.port !== "5432" ||
        decodeURIComponent(url.username) !== "postgres" ||
        decodeURIComponent(url.pathname.slice(1)) !== expectedDatabase
      ) {
        throw new Error(`STOP: ${name} is not the isolated database.`);
      }
    }

    const identity = await prisma.$queryRaw<
      Array<{
        database_name: string;
        server_host: string;
        server_port: number;
        database_user: string;
      }>
    >`
      SELECT
        current_database()::text AS database_name,
        host(inet_server_addr())::text AS server_host,
        inet_server_port()::integer AS server_port,
        current_user::text AS database_user
    `;

    if (
      identity.length !== 1 ||
      identity[0].database_name !== expectedDatabase ||
      identity[0].server_host !== "127.0.0.1" ||
      identity[0].server_port !== 5432 ||
      identity[0].database_user !== "postgres"
    ) {
      throw new Error("STOP: Unexpected PostgreSQL identity.");
    }
  });

  afterAll(async () => {
    try {
      if (createdIds.length) {
        await prisma.newsletterSubscriber.deleteMany({
          where: {
            id: { in: createdIds },
          },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it("preserves an existing pending confirmation token", async () => {
    const id = randomUUID();
    const email = `fictional-token-stability-${id}@example.invalid`;

    const originalToken = `legacy-confirm-${randomUUID()}`;
    const unsubscribeToken = `legacy-unsubscribe-${randomUUID()}`;

    await prisma.newsletterSubscriber.create({
      data: {
        id,
        email,
        status: "pending",
        confirmToken: originalToken,
        unsubscribeToken,
        subscriptionGeneration: 7,
      },
    });

    createdIds.push(id);

    const result = await createNewsletterSubscription({ email });

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(result.status).toBe("pending");
    expect(result.sendConfirmation).toBe(true);

    if (result.sendConfirmation) {
      expect(result.confirmToken).toBe(originalToken);
      expect(result.unsubscribeToken).toBe(unsubscribeToken);
      expect(result.subscriptionGeneration).toBe(7);
    }

    expect(stored.status).toBe("pending");
    expect(stored.confirmToken).toBe(originalToken);
    expect(stored.unsubscribeToken).toBe(unsubscribeToken);
    expect(stored.subscriptionGeneration).toBe(7);
  });

  it("preserves one existing token across concurrent pending requests", async () => {
    const id = randomUUID();
    const email = `fictional-token-concurrent-${id}@example.invalid`;
    const originalToken = `legacy-concurrent-${randomUUID()}`;
    const unsubscribeToken = `unsubscribe-${randomUUID()}`;

    await prisma.newsletterSubscriber.create({
      data: {
        id,
        email,
        status: "pending",
        confirmToken: originalToken,
        unsubscribeToken,
        subscriptionGeneration: 9,
      },
    });

    createdIds.push(id);

    const results = await Promise.all([
      createNewsletterSubscription({ email }),
      createNewsletterSubscription({ email }),
    ]);

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(results).toHaveLength(2);

    for (const result of results) {
      expect(result.status).toBe("pending");
      expect(result.sendConfirmation).toBe(true);

      if (result.sendConfirmation) {
        expect(result.confirmToken).toBe(originalToken);
        expect(result.unsubscribeToken).toBe(unsubscribeToken);
        expect(result.subscriptionGeneration).toBe(9);
      }
    }

    expect(stored.confirmToken).toBe(originalToken);
    expect(stored.unsubscribeToken).toBe(unsubscribeToken);
    expect(stored.subscriptionGeneration).toBe(9);
  });

  it("generates one stable token when concurrent pending requests find no token", async () => {
    const id = randomUUID();
    const email = `fictional-token-missing-${id}@example.invalid`;

    await prisma.newsletterSubscriber.create({
      data: {
        id,
        email,
        status: "pending",
        confirmToken: null,
        subscriptionGeneration: 11,
      },
    });

    createdIds.push(id);

    const results = await Promise.all([
      createNewsletterSubscription({ email }),
      createNewsletterSubscription({ email }),
    ]);

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(stored.confirmToken).toMatch(/^[a-f0-9]{48}$/);
    expect(stored.unsubscribeToken).toMatch(/^[a-f0-9]{48}$/);
    expect(stored.subscriptionGeneration).toBe(11);

    for (const result of results) {
      expect(result.status).toBe("pending");
      expect(result.sendConfirmation).toBe(true);

      if (result.sendConfirmation) {
        expect(result.confirmToken).toBe(stored.confirmToken);
        expect(result.unsubscribeToken).toBe(stored.unsubscribeToken);
        expect(result.subscriptionGeneration).toBe(11);
      }
    }
  });

  it("replaces an old token once when concurrent requests reactivate an unsubscribed subscriber", async () => {
    const id = randomUUID();
    const email = `fictional-token-reactivation-${id}@example.invalid`;
    const oldToken = `old-confirm-${randomUUID()}`;
    const unsubscribeToken = `unsubscribe-${randomUUID()}`;

    await prisma.newsletterSubscriber.create({
      data: {
        id,
        email,
        status: "unsubscribed",
        confirmToken: oldToken,
        unsubscribeToken,
        subscriptionGeneration: 3,
      },
    });

    createdIds.push(id);

    const results = await Promise.all([
      createNewsletterSubscription({ email }),
      createNewsletterSubscription({ email }),
    ]);

    const stored = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(stored.status).toBe("pending");
    expect(stored.confirmToken).toMatch(/^[a-f0-9]{48}$/);
    expect(stored.confirmToken).not.toBe(oldToken);
    expect(stored.unsubscribeToken).toBe(unsubscribeToken);
    expect(stored.subscriptionGeneration).toBe(4);

    for (const result of results) {
      expect(result.status).toBe("pending");
      expect(result.sendConfirmation).toBe(true);

      if (result.sendConfirmation) {
        expect(result.confirmToken).toBe(stored.confirmToken);
        expect(result.unsubscribeToken).toBe(unsubscribeToken);
        expect(result.subscriptionGeneration).toBe(4);
      }
    }
  });
});