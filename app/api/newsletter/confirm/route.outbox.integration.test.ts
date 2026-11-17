import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  sendNewsletterWelcomeEmail: vi.fn(),
}));

vi.mock("@/lib/resend/templates/marketing/newsletterWelcome", () => ({
  sendNewsletterWelcomeEmail: mocks.sendNewsletterWelcomeEmail,
}));

let prisma: PrismaClient;
let sharedPrisma: PrismaClient | undefined;
let databaseIdentityVerified = false;

const createdSubscriberIds: string[] = [];
const createdShopperIds: string[] = [];

function fictionalEmail(label: string): string {
  return `outbox-${label}-${randomUUID()}@example.invalid`;
}

async function createPendingSubscriber(label: string) {
  const id = randomUUID();
  const token = randomUUID();

  await prisma.newsletterSubscriber.create({
    data: {
      id,
      email: fictionalEmail(label),
      status: "pending",
      confirmToken: token,
    },
  });

  createdSubscriberIds.push(id);

  return { id, token };
}

describe("newsletter confirmation durable outbox", () => {
  let GET: typeof import("./route").GET;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("STOP: DATABASE_URL is missing.");
    }

    const parsed = new URL(databaseUrl);

    if (
      parsed.protocol !== "postgresql:" &&
      parsed.protocol !== "postgres:"
    ) {
      throw new Error("STOP: Expected PostgreSQL connection.");
    }

    if (
      parsed.hostname !== "127.0.0.1" ||
      parsed.port !== "5432" ||
      parsed.pathname !== "/veilora_marketing_consent_test_20261111" ||
      decodeURIComponent(parsed.username) !== "postgres"
    ) {
      throw new Error(
        "STOP: Tests require the exact isolated PostgreSQL database."
      );
    }

    prisma = new PrismaClient();

    const identity = await prisma.$queryRaw<
      Array<{
        database: string;
        username: string;
        address: string | null;
        port: number | null;
      }>
    >`
      SELECT
        current_database() AS database,
        current_user AS username,
        host(inet_server_addr()) AS address,
        inet_server_port() AS port
    `;

    if (
      identity.length !== 1 ||
      identity[0].database !== "veilora_marketing_consent_test_20261111" ||
      identity[0].username !== "postgres" ||
      identity[0].address !== "127.0.0.1" ||
      identity[0].port !== 5432
    ) {
      throw new Error("STOP: PostgreSQL server identity mismatch.");
    }

    const sharedModule = await import("@/lib/prisma");
    sharedPrisma = sharedModule.prisma;

    const sharedIdentity = await sharedPrisma.$queryRaw<
      Array<{
        database: string;
        username: string;
        address: string | null;
        port: number | null;
      }>
    >`
      SELECT
        current_database() AS database,
        current_user AS username,
        host(inet_server_addr()) AS address,
        inet_server_port() AS port
    `;

    if (
      sharedIdentity.length !== 1 ||
      sharedIdentity[0].database !==
        "veilora_marketing_consent_test_20261111" ||
      sharedIdentity[0].username !== "postgres" ||
      sharedIdentity[0].address !== "127.0.0.1" ||
      sharedIdentity[0].port !== 5432
    ) {
      throw new Error("STOP: Shared Prisma database identity mismatch.");
    }

    databaseIdentityVerified = true;

    ({ GET } = await import("./route"));
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.sendNewsletterWelcomeEmail.mockResolvedValue({
      id: "fictional-provider-id",
    });
  });

  afterAll(async () => {
    if (!prisma) {
      return;
    }

    try {
      if (!databaseIdentityVerified) {
        return;
      }
      if (createdShopperIds.length > 0) {
        await prisma.shopperMarketingConsentSync.deleteMany({
          where: {
            shopperId: { in: createdShopperIds },
          },
        });

        await prisma.shopper.deleteMany({
          where: {
            id: { in: createdShopperIds },
          },
        });
      }

      if (createdSubscriberIds.length > 0) {
        await prisma.newsletterSubscriber.deleteMany({
          where: {
            id: { in: createdSubscriberIds },
          },
        });
      }
    } finally {
      try {
        if (sharedPrisma && sharedPrisma !== prisma) {
          await sharedPrisma.$disconnect();
        }
      } finally {
        await prisma.$disconnect();
      }
    }
  });

  async function confirm(token: string) {
    return GET(
      new Request(
        `http://localhost:3000/api/newsletter/confirm?token=${token}`
      )
    );
  }

  it("creates exactly one pending event with successful confirmation", async () => {
    const { id, token } = await createPendingSubscriber("atomic");

    const response = await confirm(token);

    expect(response.headers.get("location")).toContain(
      "status=success"
    );

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    const events = await prisma.newsletterWelcomeEvent.findMany({
      where: { subscriberId: id },
    });

    expect(subscriber.status).toBe("subscribed");
    expect(subscriber.confirmToken).toBeNull();

    expect(events).toHaveLength(1);

    expect(events[0]).toMatchObject({
      subscriberId: id,
      subscriptionGeneration: subscriber.subscriptionGeneration,
      status: "PENDING",
      attemptCount: 0,
    });

    expect(events[0].eventKey).toBeTruthy();
  });

  it("rolls back subscriber changes when event insertion fails", async () => {
    const first = await createPendingSubscriber("duplicate-key-source");
    const second = await createPendingSubscriber("rollback-target");

    const existingEventKey = `newsletter-rollback-${randomUUID()}`;

    await prisma.newsletterWelcomeEvent.create({
      data: {
        subscriberId: first.id,
        subscriptionGeneration: 0,
        eventKey: existingEventKey,
      },
    });

    const original = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: second.id },
    });

    await expect(
      prisma.$transaction(
        async (tx) => {
          await tx.newsletterSubscriber.update({
            where: { id: second.id },
            data: {
              status: "subscribed",
              confirmToken: null,
            },
          });

          await tx.newsletterWelcomeEvent.create({
            data: {
              subscriberId: second.id,
              subscriptionGeneration: 0,
              eventKey: existingEventKey,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      )
    ).rejects.toThrow();

    const updated = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id: second.id },
    });

    const events = await prisma.newsletterWelcomeEvent.findMany({
      where: { subscriberId: second.id },
    });

    expect(original.status).toBe("pending");
    expect(updated.status).toBe("pending");
    expect(updated.confirmToken).toBe(second.token);
    expect(events).toHaveLength(0);
  });

  it("rolls back the actual confirmation route when outbox insertion fails", async () => {
    const { id, token } = await createPendingSubscriber(
      "route-rollback"
    );

    const original = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    const existingEventKey = `newsletter-preexisting-${randomUUID()}`;

    const existingEvent = await prisma.newsletterWelcomeEvent.create({
      data: {
        subscriberId: id,
        subscriptionGeneration: original.subscriptionGeneration,
        eventKey: existingEventKey,
        status: "PENDING",
        attemptCount: 0,
      },
    });

    const response = await confirm(token);

    expect(response.status).toBe(503);

    const unchanged = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    expect(unchanged.status).toBe("pending");
    expect(unchanged.confirmToken).toBe(token);
    expect(unchanged.confirmedAt).toEqual(original.confirmedAt);
    expect(unchanged.unsubscribeToken).toBe(original.unsubscribeToken);
    expect(unchanged.subscriptionGeneration).toBe(
      original.subscriptionGeneration
    );

    const events = await prisma.newsletterWelcomeEvent.findMany({
      where: { subscriberId: id },
    });

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(existingEvent.id);
    expect(events[0].eventKey).toBe(existingEventKey);
    expect(events[0].status).toBe("PENDING");
    expect(events[0].attemptCount).toBe(0);

    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });
  it("does not create an event for an invalid confirmation token", async () => {
    const { id } = await createPendingSubscriber("invalid-token");

    const response = await confirm(`invalid-${randomUUID()}`);

    expect(response.headers.get("location")).toContain(
      "status=invalid"
    );

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    const events = await prisma.newsletterWelcomeEvent.findMany({
      where: { subscriberId: id },
    });

    expect(subscriber.status).toBe("pending");
    expect(events).toHaveLength(0);
    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });

  it("does not create an event when account consent was withdrawn", async () => {
    const { id, token } = await createPendingSubscriber("withdrawal");

    const subscriber = await prisma.newsletterSubscriber.findUniqueOrThrow({
      where: { id },
    });

    const shopper = await prisma.shopper.create({
      data: {
        email: subscriber.email,
        password: "fictional-test-password",
        emailVerifiedAt: new Date(),
        marketingConsent: false,
        marketingConsentVersion: 2,
      },
    });

    createdShopperIds.push(shopper.id);

    try {
      await prisma.shopperMarketingConsentSync.create({
        data: {
          shopperId: shopper.id,
          email: subscriber.email,
          consentVersion: 2,
          reason: "ACCOUNT_OPT_OUT",
          desiredConsent: false,
          operationKey: `outbox-withdrawal-${randomUUID()}`,
        },
      });

      const response = await confirm(token);

      expect(response.headers.get("location")).toContain(
        "status=marketing-preferences"
      );

      const unchanged =
        await prisma.newsletterSubscriber.findUniqueOrThrow({
          where: { id },
        });

      const events = await prisma.newsletterWelcomeEvent.findMany({
        where: { subscriberId: id },
      });

      expect(unchanged.status).toBe("pending");
      expect(unchanged.confirmToken).toBe(token);
      expect(events).toHaveLength(0);
      expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
    } finally {
      await prisma.shopperMarketingConsentSync.deleteMany({
        where: { shopperId: shopper.id },
      });

      await prisma.shopper.delete({
        where: { id: shopper.id },
      });
    }
  });
  it("does not create a duplicate event on repeated confirmation", async () => {
    const { id, token } = await createPendingSubscriber("repeat");

    const first = await confirm(token);
    const second = await confirm(token);

    expect(first.headers.get("location")).toContain(
      "status=success"
    );

    expect(second.headers.get("location")).toContain(
      "status=invalid"
    );

    const events = await prisma.newsletterWelcomeEvent.findMany({
      where: { subscriberId: id },
    });

    expect(events).toHaveLength(1);
  });

  it("does not submit the welcome email directly from confirmation", async () => {
    const { token } = await createPendingSubscriber("no-direct-send");

    const response = await confirm(token);

    expect(response.headers.get("location")).toContain(
      "status=success"
    );

    expect(mocks.sendNewsletterWelcomeEmail).not.toHaveBeenCalled();
  });
});